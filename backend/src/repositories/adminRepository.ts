import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "../db/pool";
import { blockedIps, discordWebhooks, logs, sessions, users } from "../db/schema";
import type { AdminListFilter, AdminLog, AdminOverview, AdminPage, AdminSession, AdminUser } from "../types/admin.types";
import type { DiscordContent } from "../types/discord.types";
import type { Session } from "../types/session.types";

/** ILIKE pattern for "contains", with the LIKE wildcards in the text escaped. */
const containing = (text: string) => `%${text.replace(/[\\%_]/g, "\\$&")}%`;
const DAY_MS = 24 * 60 * 60_000;

// Correlated subqueries are plain SQL, outer columns included: drizzle leaves a ${column} unqualified in a query on
// one table, and "id" inside the subquery would then mean the subquery's own column.
const userColumns = {
  id: users.id,
  email: users.email,
  gw2Account: users.gw2Account,
  emailVerifiedAt: users.emailVerifiedAt,
  createdAt: users.createdAt,
  blockedAt: users.blockedAt,
  blockedReason: users.blockedReason,
  logCount: sql<number>`(SELECT count(*) FROM logs WHERE logs.owner_id = users.id)`.mapWith(Number),
  sessionCount: sql<number>`(SELECT count(*) FROM sessions WHERE sessions.owner_id = users.id)`.mapWith(Number),
  webhookCount: sql<number>`(SELECT count(*) FROM discord_webhooks WHERE discord_webhooks.user_id = users.id)`.mapWith(
    Number,
  ),
  lastSeenAt: sql<Date | null>`(SELECT max(user_ips.last_seen_at) FROM user_ips WHERE user_ips.user_id = users.id)`.mapWith(
    users.createdAt,
  ),
};

const logColumns = {
  id: logs.id,
  ownerId: logs.ownerId,
  ownerEmail: users.email,
  bossName: logs.bossName,
  bossIcon: logs.bossIcon,
  category: logs.category,
  groupId: logs.groupId,
  success: logs.success,
  isCM: logs.isCM,
  isLegendaryCM: logs.isLegendaryCM,
  durationMs: logs.durationMs,
  encounterTime: logs.encounterTime,
  uploadedAt: logs.uploadedAt,
  url: logs.url,
  sessionId: logs.sessionId,
  sessionName: sessions.name,
  shareToken: logs.shareToken,
};

const sessionColumns = {
  id: sessions.id,
  ownerId: sessions.ownerId,
  ownerEmail: users.email,
  name: sessions.name,
  startedAt: sessions.startedAt,
  endedAt: sessions.endedAt,
  endReason: sessions.endReason,
  shareToken: sessions.shareToken,
  logCount: sql<number>`(SELECT count(*) FROM logs WHERE logs.session_id = sessions.id)`.mapWith(Number),
};

const webhookColumns = {
  id: discordWebhooks.id,
  userId: discordWebhooks.userId,
  ownerEmail: users.email,
  position: discordWebhooks.position,
  name: discordWebhooks.name,
  url: discordWebhooks.url,
  content: discordWebhooks.content,
  enabled: discordWebhooks.enabled,
  accounts: discordWebhooks.accounts,
  minAccounts: discordWebhooks.minAccounts,
  excludedAccounts: discordWebhooks.excludedAccounts,
  createdAt: discordWebhooks.createdAt,
};
export type AdminWebhookRow = Awaited<ReturnType<typeof adminRepository.webhooks>>["rows"][number];

const total = (where: SQL | undefined, from: "users" | "logs" | "sessions" | "webhooks") => {
  const db = getDb();
  switch (from) {
    case "users":
      return db.select({ total: count() }).from(users).where(where);
    case "logs":
      return db.select({ total: count() }).from(logs).innerJoin(users, eq(users.id, logs.ownerId)).where(where);
    case "sessions":
      return db.select({ total: count() }).from(sessions).innerJoin(users, eq(users.id, sessions.ownerId)).where(where);
    case "webhooks":
      return db
        .select({ total: count() })
        .from(discordWebhooks)
        .innerJoin(users, eq(users.id, discordWebhooks.userId))
        .where(where);
  }
};

export const adminRepository = {
  /** Totals for the overview (the rate-limit count comes from rateLimitEventRepository). */
  async overview(): Promise<Omit<AdminOverview, "rateLimitEventsLast24h">> {
    const db = getDb();
    const since = sql`now() - ${DAY_MS}::bigint * interval '1 millisecond'`;
    const [[u], [l], [s], [w], [b]] = await Promise.all([
      db
        .select({
          users: count(),
          verifiedUsers: sql<number>`count(*) FILTER (WHERE ${users.emailVerifiedAt} IS NOT NULL)`.mapWith(Number),
          blockedUsers: sql<number>`count(*) FILTER (WHERE ${users.blockedAt} IS NOT NULL)`.mapWith(Number),
        })
        .from(users),
      db
        .select({ logs: count(), logsLast24h: sql<number>`count(*) FILTER (WHERE ${logs.uploadedAt} >= ${since})`.mapWith(Number) })
        .from(logs),
      db
        .select({ sessions: count(), activeSessions: sql<number>`count(*) FILTER (WHERE ${sessions.endedAt} IS NULL)`.mapWith(Number) })
        .from(sessions),
      db.select({ webhooks: count() }).from(discordWebhooks),
      db.select({ blockedIps: count() }).from(blockedIps),
    ]);
    return { ...u, ...l, ...s, ...w, ...b };
  },

  // ---------- users

  async users(filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminUser>> {
    const pattern = containing(filter.search);
    const where = filter.search ? or(ilike(users.email, pattern), ilike(users.gw2Account, pattern)) : undefined;
    const [rows, [{ total: n }]] = await Promise.all([
      getDb()
        .select(userColumns)
        .from(users)
        .where(where)
        .orderBy(desc(users.createdAt), desc(users.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      total(where, "users"),
    ]);
    return { rows, total: n };
  },

  async user(id: string): Promise<AdminUser | null> {
    const [row] = await getDb().select(userColumns).from(users).where(eq(users.id, id)).limit(1);
    return row ?? null;
  },

  /** Which of these address hashes are blocked. */
  async blockedAmong(ipHashes: string[]): Promise<Set<string>> {
    if (!ipHashes.length) return new Set();
    const rows = await getDb().select({ ipHash: blockedIps.ipHash }).from(blockedIps).where(inArray(blockedIps.ipHash, ipHashes));
    return new Set(rows.map((r) => r.ipHash));
  },

  /** Emails of these users, by id (for showing rate-limit keys). */
  async emailsOf(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await getDb().select({ id: users.id, email: users.email }).from(users).where(inArray(users.id, ids));
    return new Map(rows.map((r) => [r.id, r.email]));
  },

  // ---------- logs

  async logs(filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminLog>> {
    const pattern = containing(filter.search);
    const where = and(
      filter.search
        ? or(ilike(logs.bossName, pattern), ilike(users.email, pattern), ilike(users.gw2Account, pattern))
        : undefined,
      filter.userId ? eq(logs.ownerId, filter.userId) : undefined,
      filter.sessionId ? eq(logs.sessionId, filter.sessionId) : undefined,
    );
    const [rows, [{ total: n }]] = await Promise.all([
      getDb()
        .select(logColumns)
        .from(logs)
        .innerJoin(users, eq(users.id, logs.ownerId))
        .leftJoin(sessions, eq(sessions.id, logs.sessionId))
        .where(where)
        .orderBy(desc(logs.encounterTime), desc(logs.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      total(where, "logs"),
    ]);
    return { rows, total: n };
  },

  async findLogs(ids: string[]): Promise<{ id: string; ownerId: string; sessionId: string | null }[]> {
    if (!ids.length) return [];
    return getDb()
      .select({ id: logs.id, ownerId: logs.ownerId, sessionId: logs.sessionId })
      .from(logs)
      .where(inArray(logs.id, ids));
  },

  async deleteLogs(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const rows = await getDb().delete(logs).where(inArray(logs.id, ids)).returning({ id: logs.id });
    return rows.length;
  },

  /** A new token is only set when the log has none (an existing link keeps working); null revokes it. */
  async setLogShareToken(id: string, shareToken: string | null): Promise<boolean> {
    const value = shareToken ? sql`coalesce(${logs.shareToken}, ${shareToken})` : null;
    const rows = await getDb().update(logs).set({ shareToken: value }).where(eq(logs.id, id)).returning({ id: logs.id });
    return rows.length > 0;
  },

  async setLogSession(id: string, sessionId: string | null): Promise<void> {
    await getDb().update(logs).set({ sessionId }).where(eq(logs.id, id));
  },

  // ---------- sessions

  async sessions(filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminSession>> {
    const pattern = containing(filter.search);
    const where = and(
      filter.search ? or(ilike(sessions.name, pattern), ilike(users.email, pattern), ilike(users.gw2Account, pattern)) : undefined,
      filter.userId ? eq(sessions.ownerId, filter.userId) : undefined,
    );
    const [rows, [{ total: n }]] = await Promise.all([
      getDb()
        .select(sessionColumns)
        .from(sessions)
        .innerJoin(users, eq(users.id, sessions.ownerId))
        .where(where)
        .orderBy(desc(sessions.startedAt), desc(sessions.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      total(where, "sessions"),
    ]);
    return { rows, total: n };
  },

  async findSession(id: string): Promise<Session | null> {
    const [row] = await getDb().select().from(sessions).where(eq(sessions.id, id)).limit(1);
    return row ?? null;
  },

  async deleteSessions(ids: string[]): Promise<number> {
    if (!ids.length) return 0;
    const rows = await getDb().delete(sessions).where(inArray(sessions.id, ids)).returning({ id: sessions.id });
    return rows.length;
  },

  /** Like setLogShareToken. */
  async setSessionShareToken(id: string, shareToken: string | null): Promise<boolean> {
    const value = shareToken ? sql`coalesce(${sessions.shareToken}, ${shareToken})` : null;
    const rows = await getDb()
      .update(sessions)
      .set({ shareToken: value })
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });
    return rows.length > 0;
  },

  // ---------- webhooks

  async webhooks(filter: AdminListFilter, page: number, pageSize: number) {
    const where = and(
      filter.search ? ilike(users.email, containing(filter.search)) : undefined,
      filter.userId ? eq(discordWebhooks.userId, filter.userId) : undefined,
    );
    const [rows, [{ total: n }]] = await Promise.all([
      getDb()
        .select(webhookColumns)
        .from(discordWebhooks)
        .innerJoin(users, eq(users.id, discordWebhooks.userId))
        .where(where)
        .orderBy(asc(users.email), asc(discordWebhooks.position))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      total(where, "webhooks"),
    ]);
    return { rows, total: n };
  },

  /** All webhooks of the user the webhook `id` belongs to (to check the "logs + sessions" rule), or null. */
  async webhookWithSiblings(id: string) {
    const [hook] = await getDb()
      .select({ id: discordWebhooks.id, userId: discordWebhooks.userId })
      .from(discordWebhooks)
      .where(eq(discordWebhooks.id, id))
      .limit(1);
    if (!hook) return null;
    const all = await getDb()
      .select({ id: discordWebhooks.id, content: discordWebhooks.content })
      .from(discordWebhooks)
      .where(eq(discordWebhooks.userId, hook.userId));
    return { ...hook, all };
  },

  async updateWebhook(id: string, patch: { enabled?: boolean; content?: DiscordContent }): Promise<void> {
    await getDb().update(discordWebhooks).set(patch).where(eq(discordWebhooks.id, id));
  },

  /** Deletes the webhook; a second one left alone becomes the first. */
  async deleteWebhook(id: string): Promise<boolean> {
    return getDb().transaction(async (tx) => {
      const [gone] = await tx
        .delete(discordWebhooks)
        .where(eq(discordWebhooks.id, id))
        .returning({ userId: discordWebhooks.userId });
      if (!gone) return false;
      await tx.update(discordWebhooks).set({ position: 0 }).where(eq(discordWebhooks.userId, gone.userId));
      return true;
    });
  },

  // ---------- users' state

  async setBlocked(id: string, blocked: { at: Date; reason: string } | null): Promise<boolean> {
    const rows = await getDb()
      .update(users)
      .set(
        blocked
          ? { blockedAt: blocked.at, blockedReason: blocked.reason || null, tokensValidAfter: blocked.at }
          : { blockedAt: null, blockedReason: null },
      )
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return rows.length > 0;
  },

  /** Confirms the email by hand (an already confirmed one keeps its date). */
  async verifyEmail(id: string): Promise<boolean> {
    const rows = await getDb()
      .update(users)
      .set({ emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return rows.length > 0;
  },

  async signOutEverywhere(id: string): Promise<boolean> {
    const rows = await getDb()
      .update(users)
      .set({ tokensValidAfter: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });
    return rows.length > 0;
  },
};
