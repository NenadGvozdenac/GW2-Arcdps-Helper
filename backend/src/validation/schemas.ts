import { z } from "zod";
import { DISCORD_WEBHOOK_RE, MAX_URLS_PER_CALL, SESSION_NAME_MAX } from "../config/constants";

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
  /** Attach the imported logs to this session (sent by the desktop uploader while a session runs). */
  sessionId: z.uuid("Invalid session ID.").nullish(),
});

export const startSessionSchema = z.object({
  name: z.string().trim().max(SESSION_NAME_MAX).default(""),
});

export const updateSessionSchema = z
  .object({
    name: z.string().trim().max(SESSION_NAME_MAX).optional(),
    pinned: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.pinned !== undefined, "Nothing to update.");

export const reorderSessionsSchema = z.object({
  ids: z.array(z.uuid("Invalid session ID.")).min(1).max(1000),
});

export const deleteSessionsSchema = reorderSessionsSchema;

export const shareTokenParamSchema = z.object({
  token: z.string().regex(/^[\w-]{16,64}$/, "Invalid share link."),
});

export const idParamSchema = z.object({
  id: z.uuid("Invalid ID."),
});
