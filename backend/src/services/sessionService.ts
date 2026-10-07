import { randomBytes } from "node:crypto";
import { SESSION_TTL_MS, SHARE_TOKEN_BYTES } from "../config/constants";
import { logRepository } from "../repositories/logRepository";
import { sessionRepository, type SessionWithStats } from "../repositories/sessionRepository";
import type { Log, LogListItem } from "../types/log.types";
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

/** Shapes a session and its log totals for the sessions list. */
function toListItem({ logCount, kills, groupIds, spanStart, spanEnd, ...session }: SessionWithStats): SessionListItem {
  const span =
    spanStart && spanEnd ? { start: spanStart, end: spanEnd, durationMs: spanEnd.getTime() - spanStart.getTime() } : null;
  return { session, logCount, kills, wipes: logCount - kills, groupIds, span };
}

const newExpiry = () => new Date(Date.now() + SESSION_TTL_MS);

/** Posts the ended session's summary to the user's session webhooks (those its logs pass the filter of). */
async function postDiscordSummary(ownerId: string, session: Session, logs: Log[]): Promise<void> {
  if (!logs.length) return;
  const webhooks = discordService
    .webhooksFor(await userService.getDiscordWebhooks(ownerId), "sessions")
    .filter((w) => discordService.passesSessionFilter(w, logs));
  if (!webhooks.length) return;
  const { gw2Account } = await userService.get(ownerId);
  for (const { url } of webhooks) {
    const messageId = await discordService.notifySession(url, session, logs, logSpan(logs)!, gw2Account);
    if (messageId) await sessionRepository.saveDiscordMessage(session.id, url, messageId);
  }
}

async function endAndNotify(ownerId: string, id: string, reason: SessionEndReason, at?: Date): Promise<Session | null> {
  const session = await sessionRepository.end(ownerId, id, reason, at);
  if (!session) return null;
  await postDiscordSummary(ownerId, session, await sessionRepository.logsOf(ownerId, id));
  return session;
}

/** After an ended session, how long its logs can still be added to it ("Add logs"): as long as a session runs. */
const addLogsWindow = (session: Session) => ({
  from: session.endedAt!,
  to: new Date(session.endedAt!.getTime() + SESSION_TTL_MS),
});

/**
 * Rewrites the session's Discord summaries, if any were posted, so they show the current name and logs. Once the
 * session has no logs left, the summaries are deleted.
 */
async function refreshDiscordMessage(ownerId: string, session: Session): Promise<void> {
  if (!session.endedAt) return;
  const messages = await sessionRepository.findDiscordMessages(session.id);
  if (!messages.length) return;
  const logs = await sessionRepository.logsOf(ownerId, session.id);
  if (!logs.length) {
    for (const m of messages) await discordService.deleteSession(m.webhookUrl, m.messageId);
    await sessionRepository.deleteDiscordMessages(session.id);
    return;
  }
  const { gw2Account } = await userService.get(ownerId);
  for (const m of messages) {
    await discordService.updateSession(m.webhookUrl, m.messageId, session, logs, logSpan(logs)!, gw2Account);
  }
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

  /** Rewrites the Discord summary of an ended session after its logs changed (admin area). */
  async refreshDiscord(ownerId: string, id: string): Promise<void> {
    const session = await sessionRepository.findById(ownerId, id);
    if (session) await refreshDiscordMessage(ownerId, session);
  },

  async list(ownerId: string): Promise<Session[]> {
    await expireOverdue(ownerId);
    return sessionRepository.listByOwner(ownerId);
  },

  /**
   * One page of the sessions list (display order), each with the totals of its logs. Doesn't expire overdue sessions
   * itself: GET /sessions does that, and the website loads it first and polls it.
   */
  async page(ownerId: string, page: number, pageSize: number): Promise<SessionPage> {
    const { rows, total } = await sessionRepository.page(ownerId, page, pageSize);
    return { sessions: rows.map(toListItem), total };
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

  /** Renames and / or pins the session; a rename also updates the Discord summary of an ended session. */
  async update(ownerId: string, id: string, patch: SessionPatch): Promise<Session> {
    const before = patch.name === undefined ? null : await sessionRepository.findById(ownerId, id);
    const session = await sessionRepository.update(ownerId, id, patch);
    if (!session) throw sessionNotFound();
    if (before && before.name !== session.name) await refreshDiscordMessage(ownerId, session);
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

  /** The session's logs with their squads, oldest first (the website's practice-run summary needs the players). */
  async logs(ownerId: string, id: string): Promise<Log[]> {
    await sessionService.get(ownerId, id);
    return sessionRepository.logsOf(ownerId, id);
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

  /**
   * Takes logs out of an ended session (they stay in the user's logs), or with `deleteLogs` deletes them altogether.
   * The session's Discord summary is rewritten without them (deleted when no logs are left). Returns how many logs were affected.
   */
  async removeLogs(ownerId: string, id: string, logIds: string[], deleteLogs: boolean): Promise<number> {
    const session = await sessionService.get(ownerId, id);
    if (!session.endedAt) throw validationError("Logs can only be removed once the session has ended.");
    const removed = await sessionRepository.removeLogs(ownerId, id, [...new Set(logIds)], deleteLogs);
    if (removed) await refreshDiscordMessage(ownerId, session);
    return removed;
  },

  /**
   * Logs that can be added to an ended session (e.g. it was ended too early): those recorded up to SESSION_TTL_MS
   * after it ended that aren't in it — in no session or in another one — oldest first.
   */
  async addableLogs(ownerId: string, id: string): Promise<LogListItem[]> {
    const session = await sessionService.get(ownerId, id);
    if (!session.endedAt) return [];
    const { from, to } = addLogsWindow(session);
    return (await logRepository.listBetween(ownerId, from, to)).filter((l) => l.sessionId !== id);
  },

  /**
   * Adds logs recorded after the session ended (within the window) to it. Its Discord summary is rewritten with them —
   * or posted, if none was (the session had ended without logs); summaries of sessions they came from are rewritten
   * too. Returns how many logs were added.
   */
  async addLogs(ownerId: string, id: string, logIds: string[]): Promise<number> {
    const session = await sessionService.get(ownerId, id);
    if (!session.endedAt) throw validationError("Logs can only be added once the session has ended.");
    const { from, to } = addLogsWindow(session);
    const { added, previousSessionIds } = await sessionRepository.addLogs(ownerId, id, [...new Set(logIds)], from, to);
    if (!added) return 0;
    if ((await sessionRepository.findDiscordMessages(id)).length) await refreshDiscordMessage(ownerId, session);
    else await postDiscordSummary(ownerId, session, await sessionRepository.logsOf(ownerId, id));
    for (const previousId of previousSessionIds) await sessionService.refreshDiscord(ownerId, previousId);
    return added;
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
