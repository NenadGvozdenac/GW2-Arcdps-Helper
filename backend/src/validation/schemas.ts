import { z } from "zod";
import { DISCORD_WEBHOOK_RE, MAX_URLS_PER_CALL } from "../config/constants";

/** The GW2 account (Name.1234) is the user's identity — required. */
const gw2Account = z
  .string({ error: "GW2 account is required." })
  .trim()
  .regex(/^.{3,32}\.\d{4}$/, "GW2 account must look like Name.1234");

export const registerSchema = z.object({
  email: z.email("Invalid email address.").trim().max(254),
  password: z.string().min(6, "Password must be at least 6 characters.").max(200),
  gw2Account,
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

export const profileUpdateSchema = z.object({
  gw2Account,
});

const discordWebhookUrl = z
  .string({ error: "Webhook URL is required." })
  .trim()
  .regex(DISCORD_WEBHOOK_RE, "Not a Discord webhook URL (https://discord.com/api/webhooks/…).");

/** null disconnects the webhook. */
export const discordWebhookSchema = z.object({ url: discordWebhookUrl.nullable() });

export const discordWebhookTestSchema = z.object({ url: discordWebhookUrl });

export const submitLogsSchema = z.object({
  urls: z
    .array(z.string().trim().min(1))
    .min(1, "No links provided.")
    .max(MAX_URLS_PER_CALL, `At most ${MAX_URLS_PER_CALL} links per request.`)
    .transform((urls) => [...new Set(urls)]),
});

export const idParamSchema = z.object({
  id: z.uuid("Invalid ID."),
});
