import { and, asc, count, desc, eq, getTableColumns, gte, inArray, isNotNull, lt, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs } from "../db/schema";
import type { Category } from "../types/encounter.types";
import type { Log, LogFilter, LogListItem, LogPage, LogSummary, SquadSummary } from "../types/log.types";

const ownedBy = (ownerId: string) => eq(logs.ownerId, ownerId);

// Every column except the squad (players / accounts): what lists need. See LogListItem.
const { players: _players, accounts: _accounts, ...listColumns } = getTableColumns(logs);

/**
 * The squad at a glance, computed in the database from the stored squad (so the page doesn't carry it): size, summed
 * boss DPS / downs / deaths, and the DPS of the owner's own GW2 account.
 */
const squadSummary = sql<SquadSummary>`(
  SELECT json_build_object(
    'size', count(p),
    'dps', coalesce(round(sum((p->>'dps')::numeric)), 0)::int,
    'downs', coalesce(sum((p->>'downs')::int), 0)::int,
    'deaths', coalesce(sum((p->>'deaths')::int), 0)::int,
    'ownDps', round(max(CASE WHEN u.gw2_account <> '' AND lower(p->>'account') = lower(u.gw2_account)
                             THEN (p->>'dps')::numeric END))::int
  )
  FROM users u LEFT JOIN jsonb_array_elements(${logs.players}) AS p ON true
  WHERE u.id = ${logs.ownerId}
)`;

/** Same matching as the website's filter bar: boss name, or any account / character name containing the text. */
function matching(ownerId: string, f: LogFilter): SQL | undefined {
  const conditions: (SQL | undefined)[] = [ownedBy(ownerId)];
  if (f.category !== "all") conditions.push(eq(logs.category, f.category));
  if (f.groupId !== "all") conditions.push(eq(logs.groupId, f.groupId));
  if (f.result !== "all") conditions.push(eq(logs.success, f.result === "kill"));
  if (f.boss) conditions.push(eq(logs.bossName, f.boss));
  if (f.day) {
    const start = new Date(`${f.day}T00:00:00Z`);
    conditions.push(gte(logs.encounterTime, start), lt(logs.encounterTime, new Date(start.getTime() + 24 * 60 * 60_000)));
  }
  if (f.search) {
    const pattern = `%${f.search.replace(/[\\%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        sql`${logs.bossName} ILIKE ${pattern}`,
        sql`EXISTS (SELECT 1 FROM unnest(${logs.accounts}) AS a WHERE a ILIKE ${pattern})`,
        sql`EXISTS (SELECT 1 FROM jsonb_array_elements(${logs.players}) AS p WHERE p->>'name' ILIKE ${pattern})`,
      ),
    );
  }
  return and(...conditions);
}

export const logRepository = {
  /** Distinct encounter keys of this category killed at or after `since` (for the weekly clear). */
  async killedEncounterKeysSince(ownerId: string, category: Category, since: Date): Promise<string[]> {
    const rows = await getDb()
      .selectDistinct({ key: logs.encounterKey })
      .from(logs)
      .where(
        and(
          ownedBy(ownerId),
          eq(logs.category, category),
          eq(logs.success, true),
          gte(logs.encounterTime, since),
          isNotNull(logs.encounterKey),
        ),
      );
    return rows.map((r) => r.key!);
  },

  listByOwner(ownerId: string): Promise<LogListItem[]> {
    return getDb().select(listColumns).from(logs).where(ownedBy(ownerId)).orderBy(desc(logs.encounterTime));
  },

  /** The owner's logs whose fight started after `from` and at or before `to`, oldest first. */
  listBetween(ownerId: string, from: Date, to: Date): Promise<LogListItem[]> {
    return getDb()
      .select(listColumns)
      .from(logs)
      .where(and(ownedBy(ownerId), sql`${logs.encounterTime} > ${from}`, sql`${logs.encounterTime} <= ${to}`))
      .orderBy(asc(logs.encounterTime));
  },

  async search(ownerId: string, filter: LogFilter, page: number, pageSize: number): Promise<LogPage> {
    const where = matching(ownerId, filter);
    const [rows, [{ total }]] = await Promise.all([
      getDb()
        .select({ ...listColumns, squad: squadSummary })
        .from(logs)
        .where(where)
        .orderBy(desc(logs.encounterTime), desc(logs.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb().select({ total: count() }).from(logs).where(where),
    ]);
    return { logs: rows, total };
  },

  async searchIds(ownerId: string, filter: LogFilter): Promise<string[]> {
    const rows = await getDb().select({ id: logs.id }).from(logs).where(matching(ownerId, filter));
    return rows.map((r) => r.id);
  },

  async findById(ownerId: string, id: string): Promise<Log | null> {
    const [row] = await getDb()
      .select()
      .from(logs)
      .where(and(ownedBy(ownerId), eq(logs.id, id)))
      .limit(1);
    return row ?? null;
  },

  async findByPermalink(ownerId: string, permalink: string): Promise<Log | null> {
    const [row] = await getDb()
      .select()
      .from(logs)
      .where(and(ownedBy(ownerId), eq(logs.permalink, permalink)))
      .limit(1);
    return row ?? null;
  },

  /** Returns the new id, or null if this owner already has the permalink (e.g. concurrent submit). */
  async create(ownerId: string, summary: LogSummary, sessionId: string | null = null): Promise<string | null> {
    const [row] = await getDb()
      .insert(logs)
      .values({ ...summary, ownerId, sessionId })
      .onConflictDoNothing({ target: [logs.ownerId, logs.permalink] })
      .returning({ id: logs.id });
    return row?.id ?? null;
  },

  /** Puts an existing log into a session (e.g. a log first added on the website, then uploaded during a session). */
  async attachToSession(ownerId: string, id: string, sessionId: string): Promise<void> {
    await getDb()
      .update(logs)
      .set({ sessionId })
      .where(and(ownedBy(ownerId), eq(logs.id, id)));
  },

  /** Sets (or with null, removes) the public share token. */
  async setShareToken(ownerId: string, id: string, shareToken: string | null): Promise<Log | null> {
    const [row] = await getDb()
      .update(logs)
      .set({ shareToken })
      .where(and(ownedBy(ownerId), eq(logs.id, id)))
      .returning();
    return row ?? null;
  },

  async findByShareToken(shareToken: string): Promise<Log | null> {
    const [row] = await getDb().select().from(logs).where(eq(logs.shareToken, shareToken)).limit(1);
    return row ?? null;
  },

  /** Deletes several of the owner's logs; returns how many were deleted (other users' ids are ignored). */
  async deleteMany(ownerId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const deleted = await getDb()
      .delete(logs)
      .where(and(ownedBy(ownerId), inArray(logs.id, ids)))
      .returning({ id: logs.id });
    return deleted.length;
  },

  async delete(ownerId: string, id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(logs)
      .where(and(ownedBy(ownerId), eq(logs.id, id)))
      .returning({ id: logs.id });
    return deleted.length > 0;
  },
};
