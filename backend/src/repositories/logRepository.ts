import { and, count, desc, eq, getTableColumns, gte, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs, users } from "../db/schema";
import type { Category } from "../types/encounter.types";
import type { Log, LogFilter, LogListItem, LogPage, LogSummary } from "../types/log.types";

const ownedBy = (ownerId: string) => eq(logs.ownerId, ownerId);

/** Leaves out empty logs (ArcDPS bug) while their owner has "Skip empty logs" on. */
export const notHiddenEmpty = sql`NOT (${logs.isEmpty} AND coalesce((
  SELECT ${users.skipEmptyLogs} FROM ${users} WHERE ${users.id} = ${logs.ownerId}
), false))`;

/** The owner's logs they can see (empty ones hidden by their setting are left out). */
const visibleTo = (ownerId: string) => and(ownedBy(ownerId), notHiddenEmpty)!;

// Every column except the squad (players / accounts): what lists need. See LogListItem.
const { players: _players, accounts: _accounts, ...listColumns } = getTableColumns(logs);

/** Same matching as the website's filter bar: boss name, or any account / character name containing the text. */
function matching(ownerId: string, f: LogFilter): SQL | undefined {
  const conditions: (SQL | undefined)[] = [visibleTo(ownerId)];
  if (f.category !== "all") conditions.push(eq(logs.category, f.category));
  if (f.groupId !== "all") conditions.push(eq(logs.groupId, f.groupId));
  if (f.result !== "all") conditions.push(eq(logs.success, f.result === "kill"));
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
          visibleTo(ownerId),
          eq(logs.category, category),
          eq(logs.success, true),
          gte(logs.encounterTime, since),
          isNotNull(logs.encounterKey),
        ),
      );
    return rows.map((r) => r.key!);
  },

  listByOwner(ownerId: string): Promise<LogListItem[]> {
    return getDb().select(listColumns).from(logs).where(visibleTo(ownerId)).orderBy(desc(logs.encounterTime));
  },

  async search(ownerId: string, filter: LogFilter, page: number, pageSize: number): Promise<LogPage> {
    const where = matching(ownerId, filter);
    const [rows, [{ total }]] = await Promise.all([
      getDb()
        .select(listColumns)
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
  async create(
    ownerId: string,
    summary: LogSummary,
    sessionId: string | null = null,
    isEmpty = false,
  ): Promise<string | null> {
    const [row] = await getDb()
      .insert(logs)
      .values({ ...summary, isEmpty, ownerId, sessionId })
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
