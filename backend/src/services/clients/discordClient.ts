import { DISCORD_TIMEOUT_MS } from "../../config/constants";
import type { DiscordWebhookPayload } from "../../types/discord.types";

/** Posts a message to a Discord webhook; throws when Discord rejects it or doesn't answer in time. */
export async function postToWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<void> {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Discord returned ${res.status}`);
}
