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

export const users = pgTable(
  "users",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    passwordHash: text("password_hash").notNull(),
    gw2Account: text("gw2_account").notNull().default(""),
    /** Discord webhook that gets a message for every newly imported log; null = not connected. */
    discordWebhookUrl: text("discord_webhook_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${t.email})`)],
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
  },
  (t) => [
    foreignKey({ name: "logs_owner_id_fkey", columns: [t.ownerId], foreignColumns: [users.id] }).onDelete("cascade"),
    unique("logs_owner_id_permalink_key").on(t.ownerId, t.permalink),
    index("logs_owner_time_idx").on(t.ownerId, t.encounterTime.desc()),
  ],
);
