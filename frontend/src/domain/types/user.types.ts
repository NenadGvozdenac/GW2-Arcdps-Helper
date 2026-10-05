/** What a Discord webhook posts; with two webhooks, each posts "logs" or "sessions" (not "all"). */
export type DiscordContent = "all" | "logs" | "sessions";

/** One of the user's Discord webhooks (at most two; with two, each posts only logs or only sessions). */
export interface DiscordWebhook {
  /** The user's own label, to tell the webhooks apart; empty = none. */
  name: string;
  url: string;
  content: DiscordContent;
  /** false = paused: nothing is posted to it. */
  enabled: boolean;
  /**
   * Group filter: a log is posted only when it has `minAccounts` of these GW2 accounts, a session summary only when
   * one of its logs does. Empty = everything.
   */
  accounts: string[];
  minAccounts: number;
  /** A log with any of these GW2 accounts is not posted, nor a session summary when any of its logs has one. */
  excludedAccounts: string[];
}

export interface User {
  id: string;
  email: string;
  gw2Account: string;
  /** dps.report user token for this account's uploads (website, desktop uploader, Nexus addon); null = not set. */
  dpsReportToken: string | null;
  /** Skip empty logs (wipe at 100% with 0 DPS on the boss from everyone) that an ArcDPS bug sometimes writes. On by default. */
  skipEmptyLogs: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  gw2Account: string;
  email: string;
  password: string;
  confirmPassword: string;
  /** The "I accept the Terms of Service and Privacy Policy" checkbox; registering requires it. */
  acceptTerms: boolean;
}

export interface ProfileUpdate {
  gw2Account: string;
}
