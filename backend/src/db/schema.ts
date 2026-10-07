// Database schema — the single source of truth for tables. After changing it, generate a migration:
// `npm run migration:new -- <name>` (drizzle-kit diffs this file against src/db/migrations/meta).
// Constraint and index names match the ones Postgres gave the original tables, so existing databases line up.
import { sql } from "drizzle-orm";
import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { DISCORD_DEFAULT_MIN_ACCOUNTS } from "../config/constants";
import type { Category } from "../types/encounter.types";
import type { PlayerSummary } from "../types/log.types";
import type { AppLoginClient, AppLoginStatus } from "../types/appLogin.types";
import type { BuildBenchmark, BuildCategory, BuildGear, BuildKind } from "../types/build.types";
import type { DiscordContent } from "../types/discord.types";
import type { FeedbackCategory } from "../types/feedback.types";
import type { SessionEndReason } from "../types/session.types";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    gw2Account: text("gw2_account").notNull().default(""),
    /**
     * dps.report user token: uploads made for this user (website, desktop uploader, Nexus addon) land in their
     * dps.report account. null = anonymous uploads.
     */
    dpsReportToken: text("dps_report_token"),
    /**
     * Skip "empty" logs (a wipe with the boss at 100% and 0 DPS on the boss from everyone) that an ArcDPS bug sometimes writes:
     * they are not saved, posted to Discord or shown as uploaded in the uploader / addon.
     */
    skipEmptyLogs: boolean("skip_empty_logs").notNull().default(true),
    /** Set when the user clicks the link in the confirmation email; signing in is refused while null. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** When the user accepted the Terms of Service and Privacy Policy at registration; null = registered before they existed. */
    termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
    /** Sign-in tokens issued before this are rejected (set when the password is reset). null = all valid. */
    tokensValidAfter: timestamp("tokens_valid_after", { withTimezone: true }),
    /** Set by the administrator: signing in is refused and every token of the account is rejected. null = not blocked. */
    blockedAt: timestamp("blocked_at", { withTimezone: true }),
    /** Why the account was blocked (for the administrator only). */
    blockedReason: text("blocked_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
);

/**
 * A user's Discord webhooks: at most two. One posts new logs and / or session summaries ("all", "logs", "sessions");
 * with two, each posts either logs or sessions (both may post the same kind, e.g. to two channels).
 */
export const discordWebhooks = pgTable(
  "discord_webhooks",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 0 = first, 1 = second (the order on the settings page). */
    position: integer().notNull(),
    /** The user's own label for the webhook, to tell the two apart; empty = none. */
    name: text().notNull().default(""),
    url: text().notNull(),
    content: text().$type<DiscordContent>().notNull().default("all"),
    /** Unchecking "Active" pauses the webhook without forgetting its URL: nothing is posted to it until re-enabled. */
    enabled: boolean().notNull().default(true),
    /**
     * Group filter: a log is posted only when minAccounts of these GW2 accounts are in its squad, a session summary
     * only when at least one of its logs is. Empty = everything is posted.
     */
    accounts: text().array().notNull().default([]),
    minAccounts: integer("min_accounts").notNull().default(DISCORD_DEFAULT_MIN_ACCOUNTS),
    /**
     * Excluded GW2 accounts: a log with any of them in the squad is not posted, nor is a session summary when any of
     * its logs has one. Empty = nobody is excluded.
     */
    excludedAccounts: text("excluded_accounts").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("discord_webhooks_user_position_idx").on(t.userId, t.position)],
);

/** A group of logs recorded together (e.g. a raid night), started and ended from the desktop uploader. */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Optional label, e.g. "Full clear W1–W8"; empty = unnamed. */
    name: text().notNull().default(""),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    /** null while the session is active. */
    endedAt: timestamp("ended_at", { withTimezone: true }),
    /** "manual" (ended by the user) or "expired" (not ended within SESSION_TTL_MS); null while active. */
    endReason: text("end_reason").$type<SessionEndReason>(),
    /** An active session is ended automatically at this time; renewed when an expired session is resumed. */
    expiresAt: timestamp("expires_at", { withTimezone: true })
      .notNull()
      .default(sql`now() + interval '6 hours'`),
    /** Secret for the public read-only link (/shared/sessions/<token>); null = not shared. */
    shareToken: text("share_token"),
    /** Pinned sessions are listed first. */
    pinned: boolean().notNull().default(false),
    /** Manual order (drag & drop on the website), ascending; new sessions get the lowest value so they come first. */
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("sessions_owner_started_idx").on(t.ownerId, t.startedAt.desc()),
    uniqueIndex("sessions_share_token_idx").on(t.shareToken),
  ],
);

/**
 * The Discord summaries posted when a session ended (one per webhook that posts sessions), so renaming the session
 * can edit those messages.
 */
export const sessionDiscordMessages = pgTable(
  "session_discord_messages",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    /** Webhook that posted the message — only it can edit the message, and the user may connect another one since. */
    webhookUrl: text("webhook_url").notNull(),
    messageId: text("message_id").notNull(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.webhookUrl] })],
);

export const logs = pgTable(
  "logs",
  {
    id: uuid().primaryKey().defaultRandom(),
    ownerId: uuid("owner_id").notNull(),
    permalink: text().notNull(),
    url: text().notNull(),
    bossName: text("boss_name").notNull(),
    bossIcon: text("boss_icon"),
    triggerId: integer("trigger_id"),
    encounterKey: text("encounter_key"),
    groupId: text("group_id"),
    category: text().$type<Category>().notNull(),
    success: boolean().notNull(),
    isCM: boolean("is_cm").notNull().default(false),
    isLegendaryCM: boolean("is_legendary_cm").notNull().default(false),
    durationMs: integer("duration_ms").notNull(),
    /** % of boss HP remaining (useful for wipes). */
    bossHealthLeft: real("boss_health_left"),
    encounterTime: timestamp("encounter_time", { withTimezone: true }).notNull(),
    recordedBy: text("recorded_by"),
    gw2Build: integer("gw2_build"),
    eliteInsightsVersion: text("elite_insights_version"),
    players: jsonb().$type<PlayerSummary[]>().notNull().default([]),
    accounts: text().array().notNull().default([]),
    uploadedAt: timestamp("uploaded_at", { withTimezone: true }).notNull().defaultNow(),
    /** Session the log was recorded in; deleting the session keeps the log. */
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
    /** Secret for the public read-only link (/shared/logs/<token>); null = not shared. */
    shareToken: text("share_token"),
  },
  (t) => [
    foreignKey({ name: "logs_owner_id_fkey", columns: [t.ownerId], foreignColumns: [users.id] }).onDelete("cascade"),
    unique("logs_owner_id_permalink_key").on(t.ownerId, t.permalink),
    index("logs_owner_time_idx").on(t.ownerId, t.encounterTime.desc()),
    index("logs_session_idx").on(t.sessionId),
    uniqueIndex("logs_share_token_idx").on(t.shareToken),
  ],
);

/**
 * Feedback sent from the website, the desktop uploader or the Nexus addon (also emailed to the developer). Linked to
 * the user when they were signed in; a guest may leave an email to be answered at.
 */
export const feedback = pgTable(
  "feedback",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** null = sent by a guest (or the account was deleted since). */
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    category: text().$type<FeedbackCategory>().notNull(),
    title: text().notNull(),
    description: text().notNull(),
    /** Where to answer a guest (optional); signed-in users are answered at their account email. */
    contactEmail: text("contact_email"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("feedback_user_idx").on(t.userId)],
);

/**
 * A user's favorite Snow Crows builds: a snapshot of the build page (refreshed on request) and the user's own
 * categories for it. One row per build page per user.
 */
export const favoriteBuilds = pgTable(
  "favorite_builds",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** "snowcrows" (a favorite Snow Crows build) or "custom" (made in the website's build editor). */
    kind: text().$type<BuildKind>().notNull().default("snowcrows"),
    /** The build page on snowcrows.com; null for a custom build. */
    url: text(),
    /** A custom build's editor state (to edit it again); null for Snow Crows builds. */
    custom: jsonb().$type<Record<string, unknown>>(),
    name: text().notNull(),
    weapons: text().notNull().default(""),
    profession: text().notNull(),
    specialization: text().notNull(),
    /** In-game build template chat code; null if the page had none. */
    template: text(),
    /** When Snow Crows last updated the build, as they write it ("May 29, 2026"). */
    updated: text(),
    /** Snow Crows' last benchmark (DPS); null when the build has none. */
    benchmark: jsonb().$type<BuildBenchmark>(),
    gear: jsonb().$type<BuildGear>().notNull(),
    categories: text().array().$type<BuildCategory[]>().notNull().default([]),
    /** Manual order (drag & drop on the website), ascending; new favorites get the lowest value so they come first. */
    sortOrder: integer("sort_order").notNull().default(0),
    /** When the snapshot was taken from Snow Crows. */
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    /** The last refresh that found the build changed on Snow Crows (= fetchedAt when the latest one did); null = never. */
    changedAt: timestamp("changed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorite_builds_user_url_idx").on(t.userId, t.url)],
);

/**
 * A desktop uploader / Nexus addon asking to be signed in by someone already signed in on the website ("Sign in with
 * the browser"). The app polls it with its secret; the website approves it for the signed-in user. Short-lived.
 */
export const appLoginRequests = pgTable("app_login_requests", {
  id: uuid().primaryKey().defaultRandom(),
  /** SHA-256 of the secret only the app knows - collecting the sign-in needs it, the id in the website link doesn't. */
  secretHash: text("secret_hash").notNull(),
  /** Short code shown in the app and on the website, so the user can check they approve their own app. */
  code: text().notNull(),
  client: text().$type<AppLoginClient>().notNull(),
  status: text().$type<AppLoginStatus>().notNull().default("pending"),
  /** The user who approved it; the app is signed in as them. */
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/**
 * Throttling counters (wrong passwords, emails, Discord tests, feedback), one row per key such as
 * "discord-test:<userId>" (see rateLimitService). A row counts hits until `expiresAt`; the next hit after that starts
 * a new window. Expired rows are deleted now and then.
 */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text().primaryKey(),
    count: integer().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_expires_idx").on(t.expiresAt)],
);

/**
 * The addresses a user signed in from, as SHA-256 hashes (never the IP itself), so the administrator can block one.
 * Recorded whenever a sign-in token is issued; rows not seen for USER_IP_RETENTION_MS are deleted.
 */
export const userIps = pgTable(
  "user_ips",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ipHash: text("ip_hash").notNull(),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.ipHash] }),
    index("user_ips_ip_idx").on(t.ipHash),
    index("user_ips_last_seen_idx").on(t.lastSeenAt),
  ],
);

/** Addresses (SHA-256 hashes) the administrator blocked: every API request from them is refused. */
export const blockedIps = pgTable("blocked_ips", {
  ipHash: text("ip_hash").primaryKey(),
  /** The administrator's note, e.g. whose address it was. */
  note: text().notNull().default(""),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Every request refused by a rate limit (see rateLimitService), for the administrator's overview. `kind` is the key's
 * prefix ("login", "login-ip", "discord-test", …). Rows older than RATE_LIMIT_EVENT_RETENTION_MS are deleted.
 */
export const rateLimitEvents = pgTable(
  "rate_limit_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    key: text().notNull(),
    kind: text().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rate_limit_events_created_idx").on(t.createdAt), index("rate_limit_events_kind_idx").on(t.kind, t.createdAt)],
);
