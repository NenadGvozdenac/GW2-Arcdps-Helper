import { randomBytes } from "node:crypto";
import { SESSION_TTL_MS, SHARE_TOKEN_BYTES } from "../config/constants";
import { sessionRepository } from "../repositories/sessionRepository";
import type { Log } from "../types/log.types";
import type { LogSpan, Session, SessionEndReason, SharedSessionResponse } from "../types/session.types";
import { sessionNotFound, sessionNotResumable } from "../utils/httpError";
import { discordService } from "./discordService";
import { toSharedLog } from "./logService";
import { userService } from "./userService";

/** Start of the first fight to the end of the last one; null when there are no logs. */
export function logSpan(logs: Log[]): LogSpan | null {
  if (!logs.length) return null;
  const start = Math.min(...logs.map((l) => l.encounterTime.getTime()));
  const end = Math.max(...logs.map((l) => l.encounterTime.getTime() + l.durationMs));
  return { start: new Date(start), end: new Date(end), durationMs: end - start };
}

const newExpiry = () => new Date(Date.now() + SESSION_TTL_MS);

async function endAndNotify(ownerId: string, id: string, reason: SessionEndReason, at?: Date): Promise<Session | null> {
  const session = await sessionRepository.end(ownerId, id, reason, at);
  if (!session) return null;
  const logs = await sessionRepository.logsOf(ownerId, id);
  if (logs.length) {
    const user = await userService.get(ownerId);
    await discordService.notifySession(user.discordWebhookUrl, session, logs, logSpan(logs)!);
  }
  return session;
}

/**
 * Ends the user's sessions that ran past their expiry (reason "expired", ended at the expiry time) and posts their
 * Discord summaries. There is no background job (the API also runs serverless), so every session read / write calls
 * this first — to the user a session simply ends by itself after SESSION_TTL_MS.
 */
async function expireOverdue(ownerId: string): Promise<void> {
  for (const s of await sessionRepository.listOverdue(ownerId)) await endAndNotify(ownerId, s.id, "expired", s.expiresAt);
}

async function endActive(ownerId: string): Promise<void> {
  for (const active of await sessionRepository.listActive(ownerId)) await endAndNotify(ownerId, active.id, "manual");
}

export const sessionService = {
  expireOverdue,

  async list(ownerId: string): Promise<Session[]> {
    await expireOverdue(ownerId);
    return sessionRepository.listByOwner(ownerId);
  },

  async getActive(ownerId: string): Promise<Session | null> {
    await expireOverdue(ownerId);
    const [active] = await sessionRepository.listActive(ownerId);
    return active ?? null;
  },

  /** The most recent session, if it ended by expiring — offered to be resumed. */
  async getResumable(ownerId: string): Promise<Session | null> {
    const [latest] = await sessionRepository.listByOwner(ownerId);
    return latest?.endReason === "expired" ? latest : null;
  },

  async get(ownerId: string, id: string): Promise<Session> {
    await expireOverdue(ownerId);
    const session = await sessionRepository.findById(ownerId, id);
    if (!session) throw sessionNotFound();
    return session;
  },

  /** Starts a new session; a session that is still active is ended first (and posted to Discord). */
  async start(ownerId: string, name: string): Promise<Session> {
    await expireOverdue(ownerId);
    await endActive(ownerId);
    return sessionRepository.create(ownerId, name, newExpiry());
  },

  /** Ends the session and posts one Discord message with all of its logs. Ending it twice is a no-op. */
  async end(ownerId: string, id: string): Promise<Session> {
    await expireOverdue(ownerId);
    const ended = await endAndNotify(ownerId, id, "manual");
    return ended ?? sessionService.get(ownerId, id);
  },

  /**
   * Re-opens a session that ended automatically; it gets another SESSION_TTL_MS. A different active session is
   * ended first. Sessions the user ended themselves can't be resumed.
   */
  async resume(ownerId: string, id: string): Promise<Session> {
    const session = await sessionService.get(ownerId, id);
    if (session.endReason !== "expired") throw sessionNotResumable();
    await endActive(ownerId);
    const resumed = await sessionRepository.resume(ownerId, id, newExpiry());
    if (!resumed) throw sessionNotResumable();
    return resumed;
  },

  /** Creates the public read-only link for the session (or returns the existing one). */
  async share(ownerId: string, id: string): Promise<Session> {
    const session = await sessionService.get(ownerId, id);
    if (session.shareToken) return session;
    const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
    return (await sessionRepository.setShareToken(ownerId, id, token)) ?? session;
  },

  /** Revokes the public link; the old URL stops working. */
  async unshare(ownerId: string, id: string): Promise<Session> {
    await sessionService.get(ownerId, id);
    const session = await sessionRepository.setShareToken(ownerId, id, null);
    if (!session) throw sessionNotFound();
    return session;
  },

  /** What anyone with the share link may see: the session, whose it is and all of its logs. */
  async getShared(token: string): Promise<SharedSessionResponse> {
    let session = await sessionRepository.findByShareToken(token);
    if (!session) throw sessionNotFound();
    // Keep the auto-end after 6 hours consistent for viewers too.
    await expireOverdue(session.ownerId);
    session = (await sessionRepository.findByShareToken(token)) ?? session;
    const [owner, logs] = await Promise.all([
      userService.get(session.ownerId),
      sessionRepository.logsOf(session.ownerId, session.id),
    ]);
    return {
      session: { name: session.name, startedAt: session.startedAt, endedAt: session.endedAt, endReason: session.endReason },
      owner: owner.gw2Account,
      logs: logs.map(toSharedLog),
    };
  },

  /** Deletes the session; its logs are kept (they just no longer belong to a session). */
  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await sessionRepository.delete(ownerId, id))) throw sessionNotFound();
  },
};
