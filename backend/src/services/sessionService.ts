import { randomBytes } from "node:crypto";
import { SESSION_TTL_MS, SHARE_TOKEN_BYTES } from "../config/constants";
import { sessionRepository, type SessionLogStat } from "../repositories/sessionRepository";
import type { Log } from "../types/log.types";
import type {
  LogSpan,
  Session,
  SessionEndReason,
  SessionListItem,
  SessionPage,
  SessionPatch,
  SharedSessionResponse,
} from "../types/session.types";
import { sessionNotFound, sessionNotResumable, validationError } from "../utils/httpError";
import { discordService } from "./discordService";
import { toSharedLog } from "./logService";
import { userService } from "./userService";

/** Start of the first fight to the end of the last one; null when there are no logs. */
export function logSpan(logs: Pick<Log, "encounterTime" | "durationMs">[]): LogSpan | null {
  if (!logs.length) return null;
  const start = Math.min(...logs.map((l) => l.encounterTime.getTime()));
  const end = Math.max(...logs.map((l) => l.encounterTime.getTime() + l.durationMs));
  return { start: new Date(start), end: new Date(end), durationMs: end - start };
}

/** Totals of one session's logs (oldest first) for the sessions list. */
function summarize(session: Session, logs: SessionLogStat[]): SessionListItem {
  const kills = logs.filter((l) => l.success).length;
  const groupIds = [...new Set(logs.flatMap((l) => (l.groupId ? [l.groupId] : [])))];
  return { session, logCount: logs.length, kills, wipes: logs.length - kills, groupIds, span: logSpan(logs) };
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

  /** One page of the sessions list (display order), each with the totals of its logs. */
  async page(ownerId: string, page: number, pageSize: number): Promise<SessionPage> {
    await expireOverdue(ownerId);
    const { rows, total } = await sessionRepository.page(ownerId, page, pageSize);
    const stats = await sessionRepository.logStatsOf(
      ownerId,
      rows.map((s) => s.id),
    );
    const bySession = new Map<string, SessionLogStat[]>();
    for (const l of stats) if (l.sessionId) bySession.set(l.sessionId, [...(bySession.get(l.sessionId) ?? []), l]);
    return { sessions: rows.map((s) => summarize(s, bySession.get(s.id) ?? [])), total };
  },

  async getActive(ownerId: string): Promise<Session | null> {
    await expireOverdue(ownerId);
    const [active] = await sessionRepository.listActive(ownerId);
    return active ?? null;
  },

  /** The most recent session, if it ended by expiring — offered to be resumed. */
  async getResumable(ownerId: string): Promise<Session | null> {
    const latest = await sessionRepository.latest(ownerId);
    return latest?.endReason === "expired" ? latest : null;
  },

  /** Renames and / or pins the session. */
  async update(ownerId: string, id: string, patch: SessionPatch): Promise<Session> {
    const session = await sessionRepository.update(ownerId, id, patch);
    if (!session) throw sessionNotFound();
    return session;
  },

  /** Drag & drop: puts the session where `overId` is. Pinned and other sessions are ordered separately. */
  async move(ownerId: string, id: string, overId: string): Promise<void> {
    const [session, over] = await Promise.all([
      sessionRepository.findById(ownerId, id),
      sessionRepository.findById(ownerId, overId),
    ]);
    if (!session || !over) throw sessionNotFound();
    if (session.pinned !== over.pinned) throw validationError("Pinned and other sessions are ordered separately.");
    await sessionRepository.move(ownerId, id, overId);
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

  /** Deletes several sessions at once (their logs are kept); returns how many were deleted. */
  deleteMany: (ownerId: string, ids: string[]) => sessionRepository.deleteMany(ownerId, [...new Set(ids)]),

  /** Deletes the session; its logs are kept (they just no longer belong to a session). */
  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await sessionRepository.delete(ownerId, id))) throw sessionNotFound();
  },
};
