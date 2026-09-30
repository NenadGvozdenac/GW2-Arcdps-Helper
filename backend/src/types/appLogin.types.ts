import type { appLoginRequests } from "../db/schema";
import type { User } from "./user.types";

/** Which app asks to be signed in through the website. */
export type AppLoginClient = "uploader" | "addon";

/** pending -> the user approves (approved) or declines (denied) it on the website; the app then collects the result. */
export type AppLoginStatus = "pending" | "approved" | "denied";

/** Row of the `app_login_requests` table (see src/db/schema.ts). */
export type AppLoginRequestRow = typeof appLoginRequests.$inferSelect;

/** POST /auth/app-login: what the app keeps. `secret` never leaves the app; the website only ever sees `id`. */
export interface AppLoginCreated {
  id: string;
  secret: string;
  /** Shown in the app and on the website, so the user can check they approve their own app. */
  code: string;
  expiresAt: Date;
}

/** GET /auth/app-login/:id - what the website shows before the user approves. */
export interface AppLoginInfo {
  code: string;
  client: AppLoginClient;
  status: AppLoginStatus;
  expiresAt: Date;
}

/** POST /auth/app-login/:id/poll - the app's answer; `approved` carries the sign-in (once). */
export type AppLoginPollResult =
  | { status: "pending" }
  | { status: "denied" }
  | { status: "expired" }
  | { status: "approved"; token: string; user: User };
