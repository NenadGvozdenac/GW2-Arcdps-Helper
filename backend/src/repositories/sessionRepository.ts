import { and, asc, desc, eq, inArray, isNull, lt, min } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs, sessions } from "../db/schema";
import type { Log } from "../types/log.types";
import type { Session, SessionEndReason, SessionPatch } from "../types/session.types";

const ownedBy = (ownerId: string) => eq(sessions.ownerId, ownerId);

export const sessionRepository = {
  /** In display order: pinned first, then the manual (drag & drop) order, newest first as tie-breaker. */
  listByOwner(ownerId: string): Promise<Session[]> {
    return getDb()
      .select()
      .from(sessions)
      .where(ownedBy(ownerId))
      .orderBy(desc(sessions.pinned), asc(sessions.sortOrder), desc(sessions.startedAt));
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

  /** Stores the manual order: each id gets its index. Ids that aren't the owner's are ignored. */
  async reorder(ownerId: string, ids: string[]): Promise<void> {
    await getDb().transaction(async (tx) => {
      for (const [index, id] of ids.entries()) {
        await tx
          .update(sessions)
          .set({ sortOrder: index })
          .where(and(ownedBy(ownerId), eq(sessions.id, id)));
      }
    });
  },

  /** How many of these ids are sessions of the owner (to validate a reorder request). */
  async countOwned(ownerId: string, ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const rows = await getDb()
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(ownedBy(ownerId), inArray(sessions.id, ids)));
    return rows.length;
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

  /** The session's logs, oldest first. */
  logsOf(ownerId: string, id: string): Promise<Log[]> {
    return getDb()
      .select()
      .from(logs)
      .where(and(eq(logs.ownerId, ownerId), eq(logs.sessionId, id)))
      .orderBy(asc(logs.encounterTime));
  },
};
