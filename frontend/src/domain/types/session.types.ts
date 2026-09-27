import type { EncounterGroup } from "./encounter.types";
import type { Log, PlayerSummary } from "./log.types";

/** A group of logs recorded together (started / ended in the desktop uploader). */
export interface Session {
  id: string;
  name: string;
  startedAt: Date;
  /** null while the session is still running. */
  endedAt: Date | null;
  /** "expired": ended automatically after 6 hours (can be resumed); "manual": ended by the user. */
  endReason: "manual" | "expired" | null;
  /** When a running session is ended automatically. */
  expiresAt: Date;
  /** Secret of the public link (/shared/sessions/<token>); null = not shared. */
  shareToken: string | null;
}

/** A session opened through its public share link. */
export interface SharedSession {
  session: Pick<Session, "name" | "startedAt" | "endedAt" | "endReason">;
  /** GW2 account of the player who shared it (may be empty). */
  owner: string;
  logs: Log[];
}

/** A session made only of training-golem logs. */
export interface PracticeRun {
  /**
   * The player's highest-DPS log for every specialization they played (so different classes aren't compared),
   * highest DPS first. Empty when the player isn't in the logs (or their GW2 account isn't known).
   */
  bestPerSpec: { log: Log; player: PlayerSummary }[];
}

/** Totals of a group of logs (oldest first). */
export interface SessionSummary {
  logs: Log[];
  /** Start of the first fight to the end of the last one; null when the session has no logs yet. */
  span: { start: Date; end: Date; durationMs: number } | null;
  kills: number;
  wipes: number;
  /** Wings / fractals / strikes played, in the order they were first played. */
  groups: EncounterGroup[];
}

/** A session with its logs and what can be computed from them. */
export interface SessionView extends SessionSummary {
  session: Session;
}
