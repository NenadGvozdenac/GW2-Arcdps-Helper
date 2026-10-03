import { isIP } from "node:net";
import { z } from "zod";
import { DEFAULT_LANGUAGE, LANGUAGES } from "../i18n/languages";
import { FEEDBACK_CATEGORIES } from "../types/feedback.types";
import {
  DISCORD_DEFAULT_MIN_ACCOUNTS,
  DISCORD_MAX_FILTER_ACCOUNTS,
  DISCORD_MAX_WEBHOOKS,
  DISCORD_WEBHOOK_RE,
  DPS_REPORT_TOKEN_RE,
  FEEDBACK_DESCRIPTION_MAX,
  FEEDBACK_TITLE_MAX,
  LOGS_PAGE_SIZE,
  LOGS_PAGE_SIZE_MAX,
  MAX_URLS_PER_CALL,
  SESSION_NAME_MAX,
  SESSIONS_PAGE_SIZE,
  SESSIONS_PAGE_SIZE_MAX,
} from "../config/constants";
import { hashIp } from "../utils/clientIp";

/** The GW2 account (Name.1234) is the user's identity — required. */
const gw2Account = z
  .string({ error: "GW2 account is required." })
  .trim()
  .regex(/^.{3,32}\.\d{4}$/, "GW2 account must look like Name.1234");

/** Language of the emails we send (the website's current language). */
// Unknown or missing (older clients) → English rather than a validation error.
const emailLanguage = z.enum(LANGUAGES).catch(DEFAULT_LANGUAGE);

const password = z.string().min(6, "Password must be at least 6 characters.").max(200);

export const registerSchema = z.object({
  email: z.email("Invalid email address.").trim().max(254),
  password,
  gw2Account,
  language: emailLanguage,
  /** The "I accept the Terms of Service and Privacy Policy" checkbox — registering is refused without it. */
  acceptTerms: z.literal(true, { error: "You must accept the Terms of Service and Privacy Policy." }),
});

/** POST /auth/app-login - which app asks to be signed in through the website. */
export const appLoginCreateSchema = z.object({
  client: z.enum(["uploader", "addon"]),
});

/** POST /auth/app-login/:id/poll - the secret the app got when it created the request. */
export const appLoginPollSchema = z.object({
  secret: z.string().min(1).max(200),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Token is required.").max(2000),
});

/** Also the body of POST /auth/forgot-password. */
export const resendVerificationSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").max(254),
  language: emailLanguage,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required.").max(2000),
  password,
});

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
});

/** DELETE /profile: the current password, to confirm deleting the account. */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required."),
});

export const profileUpdateSchema = z.object({
  gw2Account,
});

const discordContent = z.enum(["all", "logs", "sessions"]).default("all");

const discordWebhookUrl = z
  .string({ error: "Webhook URL is required." })
  .trim()
  .regex(DISCORD_WEBHOOK_RE, "Not a Discord webhook URL (https://discord.com/api/webhooks/…).");

/**
 * PUT /profile/discord-webhooks: the whole list, in order (empty disconnects). With two webhooks one posts only logs
 * and the other only sessions.
 */
export const discordWebhooksSchema = z.object({
  webhooks: z
    .array(
      z.object({
        url: discordWebhookUrl,
        content: discordContent,
        enabled: z.boolean().default(true),
        accounts: z
          .array(gw2Account)
          .max(DISCORD_MAX_FILTER_ACCOUNTS, `At most ${DISCORD_MAX_FILTER_ACCOUNTS} accounts.`)
          .default([])
          // Same account twice (in any case) would count twice.
          .transform((list) => [...new Map(list.map((a) => [a.toLowerCase(), a])).values()]),
        minAccounts: z.number().int().min(1).max(DISCORD_MAX_FILTER_ACCOUNTS).default(DISCORD_DEFAULT_MIN_ACCOUNTS),
      }),
    )
    .max(DISCORD_MAX_WEBHOOKS, `At most ${DISCORD_MAX_WEBHOOKS} webhooks.`)
    .refine(
      (w) => w.length < 2 || (new Set(w.map((x) => x.content)).size === 2 && w.every((x) => x.content !== "all")),
      "With two webhooks, one posts only logs and the other only sessions.",
    ),
});

/** `content` is what the webhook will post, so the test message can say so. */
export const discordWebhookTestSchema = z.object({ url: discordWebhookUrl, content: discordContent });

/** dps.report user token (from dps.report/getUserToken); null or "" removes it. */
export const dpsReportTokenSchema = z.object({
  token: z
    .string()
    .trim()
    .regex(DPS_REPORT_TOKEN_RE, "Not a dps.report user token (letters and digits only).")
    .or(z.literal(""))
    .nullable()
    .transform((v) => v || null),
});

/** POST /feedback */
export const feedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  title: z.string().trim().min(1, "Title is required.").max(FEEDBACK_TITLE_MAX),
  description: z.string().trim().min(1, "Description is required.").max(FEEDBACK_DESCRIPTION_MAX),
  /** Guests may leave an email to be answered at; "" / null = none. Ignored for signed-in users. */
  contactEmail: z
    .email("Invalid email address.")
    .trim()
    .max(254)
    .or(z.literal(""))
    .nullish()
    .transform((v) => v || null),
});

/** PUT /profile/skip-empty-logs */
export const skipEmptyLogsSchema = z.object({ enabled: z.boolean() });

export const submitLogsSchema = z.object({
  urls: z
    .array(z.string().trim().min(1))
    .min(1, "No links provided.")
    .max(MAX_URLS_PER_CALL, `At most ${MAX_URLS_PER_CALL} links per request.`)
    .transform((urls) => [...new Set(urls)]),
  /** Attach the imported logs to this session (sent by the desktop uploader while a session runs). */
  sessionId: z.uuid("Invalid session ID.").nullish(),
});

/** Query of GET /logs/search: filters plus a 1-based page. */
export const searchLogsSchema = z.object({
  search: z.string().trim().max(100).default(""),
  category: z.enum(["all", "raid", "fractal", "strike", "other"]).default("all"),
  groupId: z.string().trim().max(40).default("all"),
  result: z.enum(["all", "kill", "wipe"]).default("all"),
  /** A UTC day ("2026-10-03"): only fights of that day. */
  day: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Invalid day.")
    .default(""),
  /** An exact boss name (from the dashboard's "most played bosses"). */
  boss: z.string().trim().max(200).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LOGS_PAGE_SIZE_MAX).default(LOGS_PAGE_SIZE),
  /** Only the ids of every matching log (no paging) — for "select all". */
  idsOnly: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
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

/** Query of GET /sessions/page (1-based page). */
export const sessionPageSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(SESSIONS_PAGE_SIZE_MAX).default(SESSIONS_PAGE_SIZE),
});

/** Body of POST /sessions/:id/move: the session takes the place of `overId` (drag & drop). */
export const moveSessionSchema = z.object({
  overId: z.uuid("Invalid session ID."),
});

export const deleteSessionsSchema = z.object({
  ids: z.array(z.uuid("Invalid session ID.")).min(1).max(1000),
});

/** Body of POST /sessions/:id/remove-logs: takes the logs out of the session, or with `deleteLogs` deletes them. */
export const removeSessionLogsSchema = z.object({
  ids: z.array(z.uuid("Invalid log ID.")).min(1).max(1000),
  deleteLogs: z.boolean().default(false),
});

export const deleteLogsSchema = z.object({
  ids: z.array(z.uuid("Invalid log ID.")).min(1).max(1000),
});

export const shareTokenParamSchema = z.object({
  token: z.string().regex(/^[\w-]{16,64}$/, "Invalid share link."),
});

export const idParamSchema = z.object({
  id: z.uuid("Invalid ID."),
});

// ---------- admin area

/** POST /admin/auth/login: step 1 of the admin sign-in. */
export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").max(254),
  password: z.string().min(1, "Password is required.").max(200),
});

/** POST /admin/auth/verify: step 2, the challenge from step 1 and the authenticator code. */
export const adminVerifySchema = z.object({
  challenge: z.string().min(1).max(2000),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

/** Query of the admin lists: text search, optional user / session filter and a 1-based page. */
export const adminListSchema = z.object({
  search: z.string().trim().max(100).default(""),
  userId: z.uuid("Invalid user ID.").optional(),
  sessionId: z.uuid("Invalid session ID.").optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminIdsSchema = z.object({
  ids: z.array(z.uuid("Invalid ID.")).min(1).max(1000),
});

export const adminBlockUserSchema = z.object({
  reason: z.string().trim().max(300).default(""),
});

/** PUT …/shared: create (or keep) the public link, or revoke it. */
export const adminSharedSchema = z.object({ shared: z.boolean() });

/** PUT /admin/logs/:id/session: a session of the same user, or null to take the log out of its session. */
export const adminLogSessionSchema = z.object({
  sessionId: z.uuid("Invalid session ID.").nullable(),
});

export const adminWebhookPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    content: z.enum(["all", "logs", "sessions"]).optional(),
  })
  .refine((v) => v.enabled !== undefined || v.content !== undefined, "Nothing to update.");

/** SHA-256 of an IP address, as stored in user_ips / blocked_ips. */
const ipHash = z.string().regex(/^[a-f0-9]{64}$/, "Invalid address hash.");

/** POST /admin/blocked-ips: an IP address (hashed here, like every request's) or an address hash from a list. */
export const adminBlockIpSchema = z
  .object({
    address: z
      .string()
      .trim()
      .refine((v) => isIP(v) !== 0 || /^[a-f0-9]{64}$/.test(v), "Enter an IP address (e.g. 195.234.32.12) or an address hash."),
    note: z.string().trim().max(300).default(""),
  })
  .transform(({ address, note }) => ({ ipHash: isIP(address) ? hashIp(address) : address, note }));

export const adminIpParamSchema = z.object({ ipHash });

/** Query of GET /admin/rate-limits/events. */
export const adminRateLimitEventsSchema = z.object({
  kind: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

/** Query of GET /admin/stats: how many days back (7, 30 or 90). */
export const adminStatsSchema = z.object({
  days: z.coerce.number().pipe(z.union([z.literal(7), z.literal(30), z.literal(90)])).default(30),
});
