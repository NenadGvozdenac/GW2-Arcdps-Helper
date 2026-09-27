import { sessionRepository } from "../repositories/sessionRepository";
import type { EncounterGroup } from "../domain/types/encounter.types";
import type { Log } from "../domain/types/log.types";
import type {
  PracticeRun,
  Session,
  SessionPage,
  SessionPatch,
  SessionSummary,
  SessionView,
} from "../domain/types/session.types";
import { encounterService } from "./encounterService";

/** Training golems (Standard / Medium / Large Kitty Golem, …) from the Special Forces Training Area. */
const isGolem = (log: Log) => /golem/i.test(log.bossName);

/** Start of the first fight to the end of the last one. */
function span(logs: Log[]): SessionSummary["span"] {
  if (!logs.length) return null;
  const start = Math.min(...logs.map((l) => l.encounterTime.getTime()));
  const end = Math.max(...logs.map((l) => l.encounterTime.getTime() + l.durationMs));
  return { start: new Date(start), end: new Date(end), durationMs: end - start };
}

export const sessionService = {
  list: () => sessionRepository.list(),

  /** One page of the sessions list; the server adds up each session's logs. */
  async page(page: number, pageSize: number): Promise<SessionPage> {
    const body = await sessionRepository.page(page, pageSize);
    return {
      sessions: body.sessions.map(({ groupIds, ...item }) => ({
        ...item,
        groups: groupIds.flatMap((id) => encounterService.groupById(id) ?? []),
      })),
      total: body.total,
    };
  },
  delete: (id: string) => sessionRepository.delete(id),
  deleteMany: (ids: string[]) => sessionRepository.deleteMany(ids),
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

  /**
   * Returns a PracticeRun when every log of the session is a training golem (null otherwise), with the highest-DPS
   * log of `account` (Name.1234) for each specialization they played.
   */
  practiceRun(logs: Log[], account: string): PracticeRun | null {
    if (!logs.length || !logs.every(isGolem)) return null;
    const best = new Map<string, PracticeRun["bestPerSpec"][number]>();
    for (const log of logs) {
      const player = log.players.find((p) => account && p.account.toLowerCase() === account.toLowerCase());
      if (!player?.profession) continue;
      const current = best.get(player.profession);
      if (!current || player.dps > current.player.dps) best.set(player.profession, { log, player });
    }
    return { bestPerSpec: [...best.values()].sort((a, b) => b.player.dps - a.player.dps) };
  },

  update: (id: string, patch: SessionPatch) => sessionRepository.update(id, patch),
  move: (id: string, overId: string) => sessionRepository.move(id, overId),

  /** Display order: pinned sessions first, otherwise keeping the given (manual) order. */
  pinnedFirst: (sessions: Session[]) => [...sessions.filter((s) => s.pinned), ...sessions.filter((s) => !s.pinned)],

  share: (id: string) => sessionRepository.share(id),
  unshare: (id: string) => sessionRepository.unshare(id),
  getShared: (token: string) => sessionRepository.getShared(token),


};
