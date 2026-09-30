/** Which app asks to be signed in through the website ("Sign in with the browser"). */
export type AppLoginClient = "uploader" | "addon";

/** A sign-in request of the desktop uploader / Nexus addon, as the confirmation page shows it. */
export interface AppLoginRequest {
  /** Also shown in the app, so the user can check they approve their own app. */
  code: string;
  client: AppLoginClient;
  status: "pending" | "approved" | "denied";
  expiresAt: Date;
}
