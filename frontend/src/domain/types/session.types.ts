import type { EncounterGroup } from "./encounter.types";
import type { Log } from "./log.types";

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
}

/** A session with its logs (oldest first) and what can be computed from them. */
export interface SessionView {
  session: Session;
  logs: Log[];
  /** Start of the first fight to the end of the last one; null when the session has no logs yet. */
  span: { start: Date; end: Date; durationMs: number } | null;
  kills: number;
  wipes: number;
  /** Wings / fractals / strikes played, in the order they were first played. */
  groups: EncounterGroup[];
}
