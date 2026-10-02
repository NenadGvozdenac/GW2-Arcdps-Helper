import { BOON_IDS } from "../../config/constants";
import type { EiJson, EiPlayer, UploadMetadata } from "../../types/dpsreport.types";
import type { Boon, BoonUptimes, LogSummary, PlayerSummary } from "../../types/log.types";
import { parseEiDate } from "../../utils/date";
import { classifyEncounter } from "./encounterClassifier";

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Per stored boon, the value `pick` reads from one of the player's EI buff lists (zeros left out). */
function perBoon(
  buffs: { id: number; buffData?: { uptime?: number; generation?: number }[] }[] | undefined,
  pick: (data: { uptime?: number; generation?: number }) => number | undefined,
): BoonUptimes {
  const byId = new Map((buffs ?? []).map((b) => [b.id, pick(b.buffData?.[0] ?? {}) ?? 0]));
  const boons: BoonUptimes = {};
  for (const [boon, id] of Object.entries(BOON_IDS) as [Boon, number][]) {
    const uptime = byId.get(id);
    if (uptime) boons[boon] = round1(uptime);
  }
  return boons;
}

function toPlayerSummary(p: EiPlayer): PlayerSummary {
  return {
    account: p.account,
    name: p.name,
    profession: p.profession,
    group: p.group,
    dps: Math.round((p.dpsTargets ?? []).reduce((sum, t) => sum + (t[0]?.dps ?? 0), 0)),
    totalDps: Math.round(p.dpsAll?.[0]?.dps ?? 0),
    downs: p.defenses?.[0]?.downCount ?? 0,
    deaths: p.defenses?.[0]?.deadCount ?? 0,
    commander: !!p.hasCommanderTag,
    breakbar: round1(p.dpsAll?.[0]?.breakbarDamage ?? 0),
    damageTaken: p.defenses?.[0]?.damageTaken ?? 0,
    boons: perBoon(p.buffUptimes, (d) => d.uptime),
    generation: perBoon(p.groupBuffs, (d) => d.generation),
  };
}

/** The squad of a log as stored (real players only, highest boss DPS first). */
export const parsePlayers = (ei: EiJson): PlayerSummary[] =>
  (ei.players ?? [])
    .filter((p) => !p.isFake && !p.friendlyNPC)
    .map(toPlayerSummary)
    .sort((a, b) => b.dps - a.dps);

/** Builds a summary from the full Elite Insights JSON. */
export function parseFromEliteInsights(permalink: string, url: string, ei: EiJson, meta: UploadMetadata): LogSummary {
  const players = parsePlayers(ei);

  const mainTarget = (ei.targets ?? []).find((t) => !t.isFake && !t.enemyPlayer);
  const burned = mainTarget?.healthPercentBurned;
  const triggerId = ei.triggerID ?? meta.encounter.bossId ?? null;

  return {
    permalink,
    url,
    bossName: ei.fightName,
    bossIcon: ei.fightIcon ?? null,
    triggerId,
    ...classifyEncounter(triggerId, ei.fightName),
    success: ei.success,
    isCM: !!ei.isCM,
    isLegendaryCM: !!ei.isLegendaryCM,
    durationMs: ei.durationMS ?? meta.encounter.duration * 1000,
    bossHealthLeft: burned != null ? Math.max(0, Math.round((100 - burned) * 100) / 100) : null,
    encounterTime: parseEiDate(ei.timeStartStd) ?? new Date(meta.encounterTime * 1000),
    recordedBy: ei.recordedAccountBy ?? ei.recordedBy ?? null,
    gw2Build: ei.gW2Build ?? meta.encounter.gw2Build ?? null,
    eliteInsightsVersion: ei.eliteInsightsVersion ?? null,
    players,
    accounts: players.map((p) => p.account),
  };
}

/** Builds a (less detailed) summary from dps.report upload metadata only. */
export function parseFromMetadata(permalink: string, url: string, meta: UploadMetadata): LogSummary {
  const e = meta.encounter;
  const players: PlayerSummary[] = Object.entries(meta.players ?? {}).map(([account, p]) => ({
    account: p.display_name || account,
    name: p.character_name,
    profession: "",
    group: 0,
    dps: 0,
    totalDps: 0,
    downs: 0,
    deaths: 0,
    commander: false,
    boons: {},
    generation: {},
  }));

  return {
    permalink,
    url,
    bossName: e.boss,
    bossIcon: null,
    triggerId: e.bossId ?? null,
    ...classifyEncounter(e.bossId ?? null, e.boss),
    success: e.success,
    isCM: e.isCm,
    isLegendaryCM: false,
    durationMs: e.duration * 1000,
    bossHealthLeft: null,
    encounterTime: new Date(meta.encounterTime * 1000),
    recordedBy: null,
    gw2Build: e.gw2Build ?? null,
    eliteInsightsVersion: null,
    players,
    accounts: players.map((p) => p.account),
  };
}

/**
 * An "empty" log: a wipe with the boss still at 100% and no damage on the boss from anyone. ArcDPS sometimes writes these
 * by mistake. Damage on other targets doesn't count (players often hit something else in such logs). Needs the Elite
 * Insights data — summaries built from metadata alone have no health or DPS to judge by.
 */
export const isEmptyLog = (log: LogSummary): boolean =>
  !log.success && log.bossHealthLeft != null && log.bossHealthLeft >= 100 && log.players.every((p) => p.dps === 0);
