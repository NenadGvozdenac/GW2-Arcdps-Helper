import { and, asc, count, desc, eq, getTableColumns, inArray, isNull, lt, min, sql } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs, sessionDiscordMessages, sessions } from "../db/schema";
import type { Log } from "../types/log.types";
import type { Session, SessionEndReason, SessionPatch } from "../types/session.types";

const ownedBy = (ownerId: string) => eq(sessions.ownerId, ownerId);
/** Pinned first, then the manual (drag & drop) order, newest first as tie-breaker. */
const displayOrder = [desc(sessions.pinned), asc(sessions.sortOrder), desc(sessions.startedAt), desc(sessions.id)];

/** A session plus what its logs add up to, as the sessions list needs it. */
export type SessionWithStats = Session & {
  logCount: number;
  kills: number;
  /** Wings / fractals / strikes, in the order they were first played. */
  groupIds: string[];
  /** Start of the first fight / end of the last one; null without logs. */
  spanStart: Date | null;
  spanEnd: Date | null;
};

// Correlated subqueries over the session's logs (logs_session_idx); only run for the rows of one page.
const sessionLogs = sql`FROM logs WHERE logs.session_id = ${sessions.id} AND logs.owner_id = ${sessions.ownerId}`;
const withStats = {
  ...getTableColumns(sessions),
  logCount: sql<number>`(SELECT count(*) ${sessionLogs})`.mapWith(Number),
  kills: sql<number>`(SELECT count(*) FILTER (WHERE logs.success) ${sessionLogs})`.mapWith(Number),
  groupIds: sql<string[]>`(
    SELECT coalesce(array_agg(g.group_id ORDER BY g.first_at), '{}')
    FROM (SELECT logs.group_id, min(logs.encounter_time) AS first_at ${sessionLogs} AND logs.group_id IS NOT NULL
          GROUP BY logs.group_id) AS g
  )`,
  spanStart: sql<Date | null>`(SELECT min(logs.encounter_time) ${sessionLogs})`.mapWith(sessions.startedAt),
  spanEnd: sql<Date | null>`(
    SELECT max(logs.encounter_time + logs.duration_ms * interval '1 millisecond') ${sessionLogs}
  )`.mapWith(sessions.startedAt),
  /** All of the owner's sessions (the window runs before LIMIT). */
  total: sql<number>`count(*) OVER ()`.mapWith(Number),
};

export const sessionRepository = {
  /** In display order. */
  listByOwner(ownerId: string): Promise<Session[]> {
    return getDb()
      .select()
      .from(sessions)
      .where(ownedBy(ownerId))
      .orderBy(...displayOrder);
  },

  /**
   * One page of the owner's sessions in display order with their log totals, plus how many sessions there are —
   * in a single query (one round trip to the database).
   */
  async page(ownerId: string, page: number, pageSize: number): Promise<{ rows: SessionWithStats[]; total: number }> {
    const rows = await getDb()
      .select(withStats)
      .from(sessions)
      .where(ownedBy(ownerId))
      .orderBy(...displayOrder)
      .limit(pageSize)
      .offset((page - 1) * pageSize);
    if (rows.length) return { rows: rows.map(({ total: _total, ...row }) => row), total: rows[0].total };
    // Past the last page there is no row to carry the total.
    const [{ total }] = page > 1 ? await getDb().select({ total: count() }).from(sessions).where(ownedBy(ownerId)) : [{ total: 0 }];
    return { rows: [], total };
  },

  /** The most recently started session. */
  async latest(ownerId: string): Promise<Session | null> {
    const [row] = await getDb()
      .select()
      .from(sessions)
      .where(ownedBy(ownerId))
      .orderBy(desc(sessions.startedAt))
      .limit(1);
    return row ?? null;
  },

  async findById(ownerId: string, id: string): Promise<Session | null> {
    const [row] = await getDb()
      .select()
      .from(sessions)
      .where(and(ownedBy(ownerId), eq(sessions.id, id)))
      .limit(1);
    return row ?? null;
  },

  /** Sessions that have not been ended yet (normally at most one). */
  listActive(ownerId: string): Promise<Session[]> {
    return getDb()
      .select()
      .from(sessions)
      .where(and(ownedBy(ownerId), isNull(sessions.endedAt)))
      .orderBy(desc(sessions.startedAt));
  },

  /** New sessions go to the top of the manual order. */
  async create(ownerId: string, name: string, expiresAt: Date): Promise<Session> {
    const db = getDb();
    const [{ lowest }] = await db.select({ lowest: min(sessions.sortOrder) }).from(sessions).where(ownedBy(ownerId));
    const sortOrder = (lowest ?? 1) - 1;
    const [row] = await db.insert(sessions).values({ ownerId, name, expiresAt, sortOrder }).returning();
    return row;
  },

  async update(ownerId: string, id: string, patch: SessionPatch): Promise<Session | null> {
    const [row] = await getDb()
      .update(sessions)
      .set(patch)
      .where(and(ownedBy(ownerId), eq(sessions.id, id)))
      .returning();
    return row ?? null;
  },

  /**
   * Moves session `id` to where `overId` is in the display order (drag & drop) and stores the whole manual order:
   * each session gets its index.
   */
  async move(ownerId: string, id: string, overId: string): Promise<void> {
    await getDb().transaction(async (tx) => {
      const rows = await tx.select({ id: sessions.id }).from(sessions).where(ownedBy(ownerId)).orderBy(...displayOrder);
      const ids = rows.map((r) => r.id);
      const from = ids.indexOf(id);
      const to = ids.indexOf(overId);
      if (from < 0 || to < 0) return;
      ids.splice(to, 0, ...ids.splice(from, 1));
      for (const [index, sessionId] of ids.entries()) {
        await tx
          .update(sessions)
          .set({ sortOrder: index })
          .where(and(ownedBy(ownerId), eq(sessions.id, sessionId)));
      }
    });
  },

  /** Marks an active session as ended; returns null if it doesn't exist or was already ended. */
  async end(ownerId: string, id: string, reason: SessionEndReason, at = new Date()): Promise<Session | null> {
    const [row] = await getDb()
      .update(sessions)
      .set({ endedAt: at, endReason: reason })
      .where(and(ownedBy(ownerId), eq(sessions.id, id), isNull(sessions.endedAt)))
      .returning();
    return row ?? null;
  },

  /** Active sessions whose time ran out (they are ended with reason "expired"). */
  listOverdue(ownerId: string, now = new Date()): Promise<Session[]> {
    return getDb()
      .select()
      .from(sessions)
      .where(and(ownedBy(ownerId), isNull(sessions.endedAt), lt(sessions.expiresAt, now)));
  },

  /** Re-opens a session that ended by expiring; returns null if it doesn't exist or didn't expire. */
  async resume(ownerId: string, id: string, expiresAt: Date): Promise<Session | null> {
    const [row] = await getDb()
      .update(sessions)
      .set({ endedAt: null, endReason: null, expiresAt })
      .where(and(ownedBy(ownerId), eq(sessions.id, id), eq(sessions.endReason, "expired")))
      .returning();
    return row ?? null;
  },

  /** Sets (or with null, removes) the public share token. */
  async setShareToken(ownerId: string, id: string, shareToken: string | null): Promise<Session | null> {
    const [row] = await getDb()
      .update(sessions)
      .set({ shareToken })
      .where(and(ownedBy(ownerId), eq(sessions.id, id)))
      .returning();
    return row ?? null;
  },

  async findByShareToken(shareToken: string): Promise<Session | null> {
    const [row] = await getDb().select().from(sessions).where(eq(sessions.shareToken, shareToken)).limit(1);
    return row ?? null;
  },

  /** Deletes several of the owner's sessions; returns how many were deleted (other users' ids are ignored). */
  async deleteMany(ownerId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const deleted = await getDb()
      .delete(sessions)
      .where(and(ownedBy(ownerId), inArray(sessions.id, ids)))
      .returning({ id: sessions.id });
    return deleted.length;
  },

  async delete(ownerId: string, id: string): Promise<boolean> {
    const deleted = await getDb()
      .delete(sessions)
      .where(and(ownedBy(ownerId), eq(sessions.id, id)))
      .returning({ id: sessions.id });
    return deleted.length > 0;
  },

  /**
   * Detaches the given logs from the session (or deletes them); returns how many were affected. Logs of other users
   * or other sessions are ignored.
   */
  async removeLogs(ownerId: string, id: string, logIds: string[], deleteLogs: boolean): Promise<number> {
    if (!logIds.length) return 0;
    const where = and(eq(logs.ownerId, ownerId), eq(logs.sessionId, id), inArray(logs.id, logIds));
    const rows = deleteLogs
      ? await getDb().delete(logs).where(where).returning({ id: logs.id })
      : await getDb().update(logs).set({ sessionId: null }).where(where).returning({ id: logs.id });
    return rows.length;
  },

  /** The session's logs, oldest first. */
  logsOf(ownerId: string, id: string): Promise<Log[]> {
    return getDb()
      .select()
      .from(logs)
      .where(and(eq(logs.ownerId, ownerId), eq(logs.sessionId, id)))
      .orderBy(asc(logs.encounterTime));
  },

  /**
   * Remembers a Discord summary of a session (one per webhook); a resumed session that ends again replaces the old
   * one of that webhook.
   */
  async saveDiscordMessage(sessionId: string, webhookUrl: string, messageId: string): Promise<void> {
    await getDb()
      .insert(sessionDiscordMessages)
      .values({ sessionId, webhookUrl, messageId })
      .onConflictDoUpdate({
        target: [sessionDiscordMessages.sessionId, sessionDiscordMessages.webhookUrl],
        set: { messageId },
      });
  },

  /** Forgets every Discord summary of the session. */
  async deleteDiscordMessages(sessionId: string): Promise<void> {
    await getDb().delete(sessionDiscordMessages).where(eq(sessionDiscordMessages.sessionId, sessionId));
  },

  /** The session's Discord summaries, one per webhook that posted it. */
  findDiscordMessages(sessionId: string): Promise<{ webhookUrl: string; messageId: string }[]> {
    return getDb()
      .select({ webhookUrl: sessionDiscordMessages.webhookUrl, messageId: sessionDiscordMessages.messageId })
      .from(sessionDiscordMessages)
      .where(eq(sessionDiscordMessages.sessionId, sessionId));
  },
};
