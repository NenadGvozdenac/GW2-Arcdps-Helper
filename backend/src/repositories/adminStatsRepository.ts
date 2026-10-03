import { sql } from "drizzle-orm";
import { getDb } from "../db/pool";

/** Day buckets are UTC dates ("2026-10-03"). */
const day = (column: string) => sql.raw(`to_char((${column} AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD')`);

async function rows<T>(query: ReturnType<typeof sql>): Promise<T[]> {
  return (await getDb().execute(query)).rows as T[];
}

/** Counts in [from, to) and in the period of the same length before it. */
async function periodCounts(table: string, column: string, from: Date, to: Date, prevFrom: Date, distinct?: string) {
  const what = distinct ? `count(DISTINCT ${distinct})` : "count(*)";
  const [row] = await rows<{ now: string; prev: string }>(sql`
    SELECT ${sql.raw(what)} FILTER (WHERE ${sql.raw(column)} >= ${from} AND ${sql.raw(column)} < ${to}) AS now,
           ${sql.raw(what)} FILTER (WHERE ${sql.raw(column)} >= ${prevFrom} AND ${sql.raw(column)} < ${from}) AS prev
    FROM ${sql.raw(table)} WHERE ${sql.raw(column)} >= ${prevFrom}
  `);
  return { now: Number(row.now), prev: Number(row.prev) };
}

/** Aggregates for the admin overview's charts; every query covers [from, to) only. */
export const adminStatsRepository = {
  async logsPerDay(from: Date) {
    const result = await rows<{ day: string; logs: string; kills: string; uploaders: string }>(sql`
      SELECT ${day("uploaded_at")} AS day, count(*) AS logs, count(*) FILTER (WHERE success) AS kills,
             count(DISTINCT owner_id) AS uploaders
      FROM logs WHERE uploaded_at >= ${from} GROUP BY 1
    `);
    return result.map((r) => ({ day: r.day, logs: Number(r.logs), kills: Number(r.kills), uploaders: Number(r.uploaders) }));
  },

  async perDay(table: "users" | "sessions", column: "created_at" | "started_at", from: Date) {
    const result = await rows<{ day: string; n: string }>(sql`
      SELECT ${day(column)} AS day, count(*) AS n FROM ${sql.raw(table)} WHERE ${sql.raw(column)} >= ${from} GROUP BY 1
    `);
    return result.map((r) => ({ day: r.day, n: Number(r.n) }));
  },

  async refusedPerDay(from: Date) {
    const result = await rows<{ day: string; kind: string; n: string }>(sql`
      SELECT ${day("created_at")} AS day, kind, count(*) AS n FROM rate_limit_events WHERE created_at >= ${from} GROUP BY 1, 2
    `);
    return result.map((r) => ({ day: r.day, kind: r.kind, n: Number(r.n) }));
  },

  newUsers: (from: Date, to: Date, prevFrom: Date) => periodCounts("users", "created_at", from, to, prevFrom),
  logs: (from: Date, to: Date, prevFrom: Date) => periodCounts("logs", "uploaded_at", from, to, prevFrom),
  kills: async (from: Date, to: Date) => {
    const [row] = await rows<{ kills: string; logs: string }>(sql`
      SELECT count(*) FILTER (WHERE success) AS kills, count(*) AS logs FROM logs WHERE uploaded_at >= ${from} AND uploaded_at < ${to}
    `);
    return { kills: Number(row.kills), logs: Number(row.logs) };
  },
  activeUsers: (from: Date, to: Date, prevFrom: Date) => periodCounts("logs", "uploaded_at", from, to, prevFrom, "owner_id"),
  sessions: (from: Date, to: Date, prevFrom: Date) => periodCounts("sessions", "started_at", from, to, prevFrom),
  refused: (from: Date, to: Date, prevFrom: Date) => periodCounts("rate_limit_events", "created_at", from, to, prevFrom),

  async logsByCategory(from: Date) {
    const result = await rows<{ category: string; logs: string; kills: string }>(sql`
      SELECT category, count(*) AS logs, count(*) FILTER (WHERE success) AS kills
      FROM logs WHERE uploaded_at >= ${from} GROUP BY 1 ORDER BY 2 DESC
    `);
    return result.map((r) => ({ category: r.category, logs: Number(r.logs), kills: Number(r.kills) }));
  },

  async topBosses(from: Date, limit: number) {
    const result = await rows<{ boss: string; logs: string; kills: string }>(sql`
      SELECT boss_name AS boss, count(*) AS logs, count(*) FILTER (WHERE success) AS kills
      FROM logs WHERE uploaded_at >= ${from} GROUP BY 1 ORDER BY 2 DESC, 1 LIMIT ${limit}
    `);
    return result.map((r) => ({ boss: r.boss, logs: Number(r.logs), kills: Number(r.kills) }));
  },

  async topUploaders(from: Date, limit: number) {
    const result = await rows<{ user_id: string; email: string; gw2_account: string; logs: string; sessions: string }>(sql`
      SELECT u.id AS user_id, u.email, u.gw2_account, count(l.id) AS logs,
             (SELECT count(*) FROM sessions s WHERE s.owner_id = u.id AND s.started_at >= ${from}) AS sessions
      FROM logs l JOIN users u ON u.id = l.owner_id
      WHERE l.uploaded_at >= ${from}
      GROUP BY u.id, u.email, u.gw2_account ORDER BY logs DESC, u.email LIMIT ${limit}
    `);
    return result.map((r) => ({
      userId: r.user_id,
      email: r.email,
      gw2Account: r.gw2_account,
      logs: Number(r.logs),
      sessions: Number(r.sessions),
    }));
  },
};
