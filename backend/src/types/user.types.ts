import type { users } from "../db/schema";

/** Row of the `users` table (see src/db/schema.ts). */
export type UserRow = typeof users.$inferSelect;

/** Public user shape returned by the API (never contains the password hash). */
export type User = Omit<UserRow, "passwordHash">;

export interface NewUser {
  email: string;
  passwordHash: string;
  gw2Account: string;
}

export interface ProfileUpdate {
  gw2Account: string;
}

/** Columns a signed-in user may change. */
export type UserPatch = Partial<Pick<UserRow, "gw2Account" | "discordWebhookUrl" | "dpsReportToken">>;
