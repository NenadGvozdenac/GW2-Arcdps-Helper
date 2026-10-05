/** What a webhook posts; with two webhooks, each posts "logs" or "sessions" (not "all"). */
export type DiscordContent = "all" | "logs" | "sessions";

/** One of a user's Discord webhooks, as the API sends and receives it (in order: first, second). */
export interface DiscordWebhook {
  /** The user's own label, to tell the webhooks apart; empty = none. */
  name: string;
  url: string;
  content: DiscordContent;
  /** false = paused: nothing is posted to it. */
  enabled: boolean;
  /**
   * Group filter: a log is posted only when it has `minAccounts` of these GW2 accounts, a session summary only when
   * one of its logs does. Empty = no filter.
   */
  accounts: string[];
  minAccounts: number;
  /** A log with any of these GW2 accounts is not posted, nor a session summary when any of its logs has one. */
  excludedAccounts: string[];
}

/** Subset of Discord's "Execute Webhook" body that we send. */
export interface DiscordEmbed {
  title: string;
  url?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  thumbnail?: { url: string };
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  username?: string;
  content?: string;
  embeds?: DiscordEmbed[];
}
