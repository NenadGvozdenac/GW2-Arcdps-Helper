/** What the first Discord webhook posts; a second webhook, when connected, posts the rest. */
export type DiscordContent = "all" | "logs" | "sessions";

/** One of the user's Discord webhooks (at most two; with two, one posts logs and the other sessions). */
export interface DiscordWebhook {
  url: string;
  content: DiscordContent;
  /** false = paused: nothing is posted to it. */
  enabled: boolean;
  /**
   * Session filter (webhook that posts sessions): a session summary is posted only when one of its logs has
   * `minAccounts` of these GW2 accounts. Empty = every session.
   */
  accounts: string[];
  minAccounts: number;
}

export interface User {
  id: string;
  email: string;
  gw2Account: string;
  /** dps.report user token for this account's uploads (website, desktop uploader, Nexus addon); null = not set. */
  dpsReportToken: string | null;
  /** Skip empty logs (wipe at 100% with 0 DPS from everyone) that an ArcDPS bug sometimes writes. On by default. */
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
