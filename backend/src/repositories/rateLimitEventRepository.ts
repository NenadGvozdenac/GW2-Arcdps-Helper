import { count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/pool";
import { rateLimitEvents, rateLimits } from "../db/schema";

export interface RateLimitEvent {
  id: string;
  key: string;
  kind: string;
  createdAt: Date;
}

export interface RateLimitKindSummary {
  kind: string;
  /** Refused requests in the last 24 hours / 7 days. */
  last24h: number;
  last7d: number;
}

export interface RateLimitKeySummary {
  key: string;
  kind: string;
  refused: number;
  lastAt: Date;
}

export interface ActiveRateLimit {
  key: string;
  count: number;
  expiresAt: Date;
}

const since = (ms: number) => sql`now() - ${ms}::bigint * interval '1 millisecond'`;
const DAY_MS = 24 * 60 * 60_000;

export const rateLimitEventRepository = {
  async record(key: string, kind: string): Promise<void> {
    await getDb().insert(rateLimitEvents).values({ key, kind });
  },

  async deleteBefore(before: Date): Promise<void> {
    await getDb().delete(rateLimitEvents).where(lt(rateLimitEvents.createdAt, before));
  },

  /** Newest first, optionally of one kind. */
  async page(kind: string | null, page: number, pageSize: number): Promise<{ rows: RateLimitEvent[]; total: number }> {
    const where: SQL | undefined = kind ? eq(rateLimitEvents.kind, kind) : undefined;
    const [rows, [{ total }]] = await Promise.all([
      getDb()
        .select()
        .from(rateLimitEvents)
        .where(where)
        .orderBy(desc(rateLimitEvents.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb().select({ total: count() }).from(rateLimitEvents).where(where),
    ]);
    return { rows, total };
  },

  /** Refused requests per kind over the last week. */
  byKind(): Promise<RateLimitKindSummary[]> {
    return getDb()
      .select({
        kind: rateLimitEvents.kind,
        last24h: sql<number>`count(*) FILTER (WHERE ${rateLimitEvents.createdAt} >= ${since(DAY_MS)})`.mapWith(Number),
        last7d: count(),
      })
      .from(rateLimitEvents)
      .where(gte(rateLimitEvents.createdAt, since(7 * DAY_MS)))
      .groupBy(rateLimitEvents.kind)
      .orderBy(desc(count()));
  },

  /** The keys refused most often in the last 24 hours. */
  topKeys(limit: number): Promise<RateLimitKeySummary[]> {
    return getDb()
      .select({
        key: rateLimitEvents.key,
        kind: rateLimitEvents.kind,
        refused: count(),
        lastAt: sql<Date>`max(${rateLimitEvents.createdAt})`.mapWith(rateLimitEvents.createdAt),
      })
      .from(rateLimitEvents)
      .where(gte(rateLimitEvents.createdAt, since(DAY_MS)))
      .groupBy(rateLimitEvents.key, rateLimitEvents.kind)
      .orderBy(desc(count()))
      .limit(limit);
  },

  /** Counters whose window is still running, fullest first. */
  active(limit: number): Promise<ActiveRateLimit[]> {
    return getDb()
      .select({ key: rateLimits.key, count: rateLimits.count, expiresAt: rateLimits.expiresAt })
      .from(rateLimits)
      .where(gte(rateLimits.expiresAt, sql`now()`))
      .orderBy(desc(rateLimits.count), desc(rateLimits.expiresAt))
      .limit(limit);
  },

  async countSince(ms: number): Promise<number> {
    const [{ total }] = await getDb()
      .select({ total: count() })
      .from(rateLimitEvents)
      .where(gte(rateLimitEvents.createdAt, since(ms)));
    return total;
  },
};
