// ONE-OFF: fills in who generated which boons for their subgroup (PlayerSummary.generation — the quickness / alacrity
// providers) for logs imported before it was stored.
// Runs in the deploy workflow after the migrations; delete this file and its workflow step once production is filled.
// Usage: `npm run backfill:generation` (dev), or `node dist/scripts/backfillBoonGeneration.js` after a build.
//
// Safe to run repeatedly: it only touches logs whose players have no `generation` yet. Logs dps.report has no Elite
// Insights JSON for get `generation: {}` (= no data) so they aren't retried; logs that fail because dps.report is
// unreachable or busy are left as they are and picked up by the next run.
import { eq, sql } from "drizzle-orm";
import { DPS_REPORT_BASE_URL, PARALLEL_FETCHES } from "../config/constants";
import { closePool, getDb } from "../db/pool";
import { logs } from "../db/schema";
import { parsePlayers } from "../services/misc/logParser";
import type { EiJson } from "../types/dpsreport.types";
import type { PlayerSummary } from "../types/log.types";

/** Pause between batches, to stay polite towards dps.report. */
const BATCH_PAUSE_MS = 500;
const FETCH_TIMEOUT_MS = 60_000;

type Outcome = "filled" | "noData" | "failed";

/** The EI JSON, null when dps.report has none for this log; throws when dps.report can't be reached right now. */
async function fetchEiJson(permalink: string): Promise<EiJson | null> {
  const res = await fetch(`${DPS_REPORT_BASE_URL}/getJson?permalink=${encodeURIComponent(permalink)}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.status === 429 || res.status >= 500) throw new Error(`dps.report returned ${res.status}`);
  const body = (await res.json().catch(() => null)) as (EiJson & { error?: string }) | null;
  return res.ok && body && !body.error && body.players?.length ? body : null;
}

async function backfill(log: { id: string; permalink: string; players: PlayerSummary[] }): Promise<Outcome> {
  let ei: EiJson | null;
  try {
    ei = await fetchEiJson(log.permalink);
  } catch (err) {
    console.warn(`  ${log.permalink}: ${err instanceof Error ? err.message : err} — will retry on the next run`);
    return "failed";
  }
  const players = ei
    ? parsePlayers(ei)
    : log.players.map((p) => ({ ...p, boons: p.boons ?? {}, generation: p.generation ?? {} }));
  await getDb().update(logs).set({ players }).where(eq(logs.id, log.id));
  return ei ? "filled" : "noData";
}

async function main() {
  const missing = await getDb()
    .select({ id: logs.id, permalink: logs.permalink, players: logs.players })
    .from(logs)
    .where(sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${logs.players}) AS p WHERE NOT (p ? 'generation'))`)
    .orderBy(logs.encounterTime);
  console.log(`backfill generation: ${missing.length} log(s) without boon generation data`);

  const counts: Record<Outcome, number> = { filled: 0, noData: 0, failed: 0 };
  for (let i = 0; i < missing.length; i += PARALLEL_FETCHES) {
    const outcomes = await Promise.all(missing.slice(i, i + PARALLEL_FETCHES).map(backfill));
    for (const o of outcomes) counts[o]++;
    const done = Math.min(i + PARALLEL_FETCHES, missing.length);
    if (done % 40 < PARALLEL_FETCHES || done === missing.length) console.log(`  ${done}/${missing.length}`);
    if (done < missing.length) await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
  }
  console.log(
    `backfill generation: ${counts.filled} filled, ${counts.noData} without Elite Insights data, ${counts.failed} failed (retried next run)`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(closePool);
