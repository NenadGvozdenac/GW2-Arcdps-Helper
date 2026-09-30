/** What the first webhook posts; a second webhook, when connected, posts the rest. */
export type DiscordContent = "all" | "logs" | "sessions";

/** One of a user's Discord webhooks, as the API sends and receives it (in order: first, second). */
export interface DiscordWebhook {
  url: string;
  content: DiscordContent;
  /** false = paused: nothing is posted to it. */
  enabled: boolean;
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
