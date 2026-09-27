import type { sessions } from "../db/schema";
import type { Log } from "./log.types";

/** Why a session ended: the user ended it, or it ran past SESSION_TTL_MS without being ended. */
export type SessionEndReason = "manual" | "expired";

/** Row of the `sessions` table (see src/db/schema.ts). endedAt is null while the session is active. */
export type Session = typeof sessions.$inferSelect;

/** A log as shown on a public shared-session page (without internal owner / session ids). */
export type SharedLog = Omit<Log, "ownerId" | "sessionId">;

/** GET /shared/sessions/:token — a session anyone with the link may view. */
export interface SharedSessionResponse {
  session: Pick<Session, "name" | "startedAt" | "endedAt" | "endReason">;
  /** GW2 account of the player who recorded it (empty if they haven't set one). */
  owner: string;
  logs: SharedLog[];
}

/** When a group of logs happened: start of the first fight to the end of the last one. */
export interface LogSpan {
  start: Date;
  end: Date;
  durationMs: number;
}
