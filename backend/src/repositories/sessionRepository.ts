import { and, asc, desc, eq, isNull, lt } from "drizzle-orm";
import { getDb } from "../db/pool";
import { logs, sessions } from "../db/schema";
import type { Log } from "../types/log.types";
import type { Session, SessionEndReason } from "../types/session.types";

const ownedBy = (ownerId: string) => eq(sessions.ownerId, ownerId);

export const sessionRepository = {
  listByOwner(ownerId: string): Promise<Session[]> {
    return getDb().select().from(sessions).where(ownedBy(ownerId)).orderBy(desc(sessions.startedAt));
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

  async create(ownerId: string, name: string, expiresAt: Date): Promise<Session> {
    const [row] = await getDb().insert(sessions).values({ ownerId, name, expiresAt }).returning();
    return row;
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
