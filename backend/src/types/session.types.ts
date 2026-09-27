import type { sessions } from "../db/schema";

/** Why a session ended: the user ended it, or it ran past SESSION_TTL_MS without being ended. */
export type SessionEndReason = "manual" | "expired";

/** Row of the `sessions` table (see src/db/schema.ts). endedAt is null while the session is active. */
export type Session = typeof sessions.$inferSelect;

/** When a group of logs happened: start of the first fight to the end of the last one. */
export interface LogSpan {
  start: Date;
  end: Date;
  durationMs: number;
}
