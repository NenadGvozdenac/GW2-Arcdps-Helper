import { DISCORD_TIMEOUT_MS } from "../../config/constants";
import type { DiscordWebhookPayload } from "../../types/discord.types";

async function send(url: string, method: "POST" | "PATCH" | "DELETE", payload?: DiscordWebhookPayload): Promise<Response> {
  const res = await fetch(url, {
    method,
    ...(payload ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) } : {}),
    signal: AbortSignal.timeout(DISCORD_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Discord returned ${res.status}`);
  return res;
}

/**
 * Posts a message to a Discord webhook and returns the new message's ID; throws when Discord rejects it or doesn't
 * answer in time. `wait=true` makes Discord answer with the message instead of an empty 204.
 */
export async function postToWebhook(webhookUrl: string, payload: DiscordWebhookPayload): Promise<string> {
  const res = await send(`${webhookUrl}?wait=true`, "POST", payload);
  const message = (await res.json()) as { id: string };
  return message.id;
}

/** Replaces a message this webhook posted earlier; throws like postToWebhook (404 when it was deleted). */
export async function editWebhookMessage(
  webhookUrl: string,
  messageId: string,
  payload: DiscordWebhookPayload,
): Promise<void> {
  await send(`${webhookUrl}/messages/${messageId}`, "PATCH", payload);
}

/** Deletes a message this webhook posted earlier; throws like postToWebhook (404 when it was deleted already). */
export async function deleteWebhookMessage(webhookUrl: string, messageId: string): Promise<void> {
  await send(`${webhookUrl}/messages/${messageId}`, "DELETE");
}
