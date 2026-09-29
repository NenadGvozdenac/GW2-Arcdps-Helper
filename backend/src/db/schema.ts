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
  real,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Category } from "../types/encounter.types";
import type { PlayerSummary } from "../types/log.types";
import type { SessionEndReason } from "../types/session.types";

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    gw2Account: text("gw2_account").notNull().default(""),
    /** Discord webhook that gets a message for every newly imported log; null = not connected. */
    discordWebhookUrl: text("discord_webhook_url"),
    /**
     * dps.report user token: uploads made for this user (website, desktop uploader, Nexus addon) land in their
     * dps.report account. null = anonymous uploads.
     */
    dpsReportToken: text("dps_report_token"),
    /** Set when the user clicks the link in the confirmation email; signing in is refused while null. */
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    /** Last confirmation email sent, to throttle "resend" requests. */
    verificationEmailSentAt: timestamp("verification_email_sent_at", { withTimezone: true }),
    /** Last password-reset email sent, to throttle "forgot password" requests. */
    passwordResetSentAt: timestamp("password_reset_sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
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

/** The Discord summary posted when a session ended, so renaming the session can edit that message. */
export const sessionDiscordMessages = pgTable("session_discord_messages", {
  sessionId: uuid("session_id")
    .primaryKey()
    .references(() => sessions.id, { onDelete: "cascade" }),
  /** Webhook that posted the message — only it can edit the message, and the user may connect another one since. */
  webhookUrl: text("webhook_url").notNull(),
  messageId: text("message_id").notNull(),
});

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
