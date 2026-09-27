import type { sessions } from "../db/schema";
import type { SharedLog } from "./log.types";

/** Why a session ended: the user ended it, or it ran past SESSION_TTL_MS without being ended. */
export type SessionEndReason = "manual" | "expired";

/** Row of the `sessions` table (see src/db/schema.ts). endedAt is null while the session is active. */
export type Session = typeof sessions.$inferSelect;

/** Fields the owner may change on a session. */
export type SessionPatch = Partial<Pick<Session, "name" | "pinned">>;

/** GET /shared/sessions/:token — a session anyone with the link may view. */
export interface SharedSessionResponse {
  session: Pick<Session, "name" | "startedAt" | "endedAt" | "endReason">;
  /** GW2 account of the player who recorded it (empty if they haven't set one). */
  owner: string;
  logs: SharedLog[];
}

/** A session on the sessions list, with what its logs add up to (so the list doesn't need the logs). */
export interface SessionListItem {
  session: Session;
  logCount: number;
  kills: number;
  wipes: number;
  /** Wings / fractals / strikes played, in the order they were first played. */
  groupIds: string[];
  span: LogSpan | null;
}

/** One page of the sessions list, in display order. */
export interface SessionPage {
  sessions: SessionListItem[];
  /** How many sessions the user has in total. */
  total: number;
}

/** When a group of logs happened: start of the first fight to the end of the last one. */
export interface LogSpan {
  start: Date;
  end: Date;
  durationMs: number;
}
