import { sessionRepository } from "../repositories/sessionRepository";
import type { EncounterGroup } from "../domain/types/encounter.types";
import type { Log } from "../domain/types/log.types";
import type { Session, SessionSummary, SessionView } from "../domain/types/session.types";
import { encounterService } from "./encounterService";

/** Start of the first fight to the end of the last one. */
function span(logs: Log[]): SessionSummary["span"] {
  if (!logs.length) return null;
  const start = Math.min(...logs.map((l) => l.encounterTime.getTime()));
  const end = Math.max(...logs.map((l) => l.encounterTime.getTime() + l.durationMs));
  return { start: new Date(start), end: new Date(end), durationMs: end - start };
}

export const sessionService = {
  list: () => sessionRepository.list(),
  delete: (id: string) => sessionRepository.delete(id),
  resume: (id: string) => sessionRepository.resume(id),

  /** Only sessions that ended by themselves after 6 hours can be resumed. */
  canResume: (session: Session) => session.endReason === "expired",

  /** Combines sessions with the user's logs (which carry their sessionId). Newest session first. */
  views(sessions: Session[], logs: Log[]): SessionView[] {
    const bySession = new Map<string, Log[]>();
    for (const l of logs) {
      if (!l.sessionId) continue;
      bySession.set(l.sessionId, [...(bySession.get(l.sessionId) ?? []), l]);
    }
    return sessions.map((session) => ({ session, ...sessionService.summarize(bySession.get(session.id) ?? []) }));
  },

  /** Sorts the logs oldest first and computes duration, kills / wipes and the content played. */
  summarize(logs: Log[]): SessionSummary {
    const sorted = [...logs].sort((a, b) => a.encounterTime.getTime() - b.encounterTime.getTime());
    const kills = sorted.filter((l) => l.success).length;
    const groups: EncounterGroup[] = [];
    for (const l of sorted) {
      const g = encounterService.groupById(l.groupId);
      if (g && !groups.includes(g)) groups.push(g);
    }
    return { logs: sorted, span: span(sorted), kills, wipes: sorted.length - kills, groups };
  },

  share: (id: string) => sessionRepository.share(id),
  unshare: (id: string) => sessionRepository.unshare(id),
  getShared: (token: string) => sessionRepository.getShared(token),

  /** Full URL of a session's public page. */
  shareUrl: (token: string) => `${window.location.origin}/shared/sessions/${token}`,
};
