import type { users } from "../db/schema";

/** Row of the `users` table (see src/db/schema.ts). */
export type UserRow = typeof users.$inferSelect;

/** Public user shape returned by the API (never contains the password hash). */
export type User = Omit<UserRow, "passwordHash" | "termsAcceptedAt" | "tokensValidAfter" | "blockedAt" | "blockedReason">;

export interface NewUser {
  email: string;
  passwordHash: string;
  gw2Account: string;
  termsAcceptedAt: Date;
}

export interface ProfileUpdate {
  gw2Account: string;
}

/** Columns updated through userRepository.update (profile settings, password, email confirmation). */
export type UserPatch = Partial<
  Pick<
    UserRow,
    | "gw2Account"
    | "dpsReportToken"
    | "skipEmptyLogs"
    | "passwordHash"
    | "emailVerifiedAt"
    | "tokensValidAfter"
    | "blockedAt"
    | "blockedReason"
  >
>;
