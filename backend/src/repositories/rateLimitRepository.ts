import { and, eq, gt, gte, like, lte, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { rateLimits } from "../db/schema";

export const rateLimitRepository = {
  /**
   * Counts a hit on `key`: the first one (or the first after the window ran out) starts a new window of `windowMs`.
   * Returns false, counting nothing, when the window already has `max` hits. One statement, so parallel requests
   * can't slip past the limit.
   */
  async hit(key: string, max: number, windowMs: number): Promise<boolean> {
    const expired = sql`${rateLimits.expiresAt} <= now()`;
    const newExpiry = sql`now() + ${windowMs}::integer * interval '1 millisecond'`;
    const rows = await getDb()
      .insert(rateLimits)
      .values({ key, count: 1, expiresAt: newExpiry })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${expired} THEN 1 ELSE ${rateLimits.count} + 1 END`,
          expiresAt: sql`CASE WHEN ${expired} THEN ${newExpiry} ELSE ${rateLimits.expiresAt} END`,
        },
        setWhere: sql`${expired} OR ${rateLimits.count} < ${max}`,
      })
      .returning({ key: rateLimits.key });
    return rows.length > 0;
  },

  /** Whether `key` has `max` hits in its current window (counts nothing). */
  async isLimited(key: string, max: number): Promise<boolean> {
    const [row] = await getDb()
      .select({ key: rateLimits.key })
      .from(rateLimits)
      .where(and(eq(rateLimits.key, key), gt(rateLimits.expiresAt, sql`now()`), gte(rateLimits.count, max)))
      .limit(1);
    return !!row;
  },

  async clear(key: string): Promise<void> {
    await getDb().delete(rateLimits).where(eq(rateLimits.key, key));
  },

  /** Clears every key starting with `prefix` (e.g. all IPs of one account). */
  async clearPrefix(prefix: string): Promise<void> {
    const escaped = prefix.replace(/[\\%_]/g, (c) => `\\${c}`);
    await getDb().delete(rateLimits).where(like(rateLimits.key, `${escaped}%`));
  },

  async deleteExpired(): Promise<void> {
    await getDb().delete(rateLimits).where(lte(rateLimits.expiresAt, sql`now()`));
  },
};
