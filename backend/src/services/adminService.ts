import { randomBytes } from "node:crypto";
import { SHARE_TOKEN_BYTES } from "../config/constants";
import { adminRepository, type AdminWebhookRow } from "../repositories/adminRepository";
import { adminStatsRepository as stats } from "../repositories/adminStatsRepository";
import { rateLimitEventRepository } from "../repositories/rateLimitEventRepository";
import { userRepository } from "../repositories/userRepository";
import type {
  AdminListFilter,
  AdminLog,
  AdminOverview,
  AdminPage,
  AdminSession,
  AdminStats,
  AdminStatsDay,
  AdminStatsDays,
  AdminUser,
  AdminUserDetail,
  AdminWebhook,
} from "../types/admin.types";
import type { DiscordContent } from "../types/discord.types";
import { logNotFound, sessionNotFound, userNotFound, validationError, webhookNotFound } from "../utils/httpError";
import { blockedIpService } from "./blockedIpService";
import { sessionService } from "./sessionService";
import { userIpService } from "./userIpService";

const DAY_MS = 24 * 60 * 60_000;
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/;
/** Kinds whose key ends with the client's IP hash (see authService, feedbackService, adminAuthService). */
const IP_KINDS = new Set(["login", "login-ip", "feedback", "admin-login-ip"]);

const newShareToken = () => randomBytes(SHARE_TOKEN_BYTES).toString("base64url");

/** Keeps the webhook id and the first characters of its secret: recognisable, but not usable. */
const maskUrl = (url: string) => url.replace(/\/([\w-]{4})[\w-]*$/, "/$1…");
const toAdminWebhook = ({ url, ...w }: AdminWebhookRow): AdminWebhook => ({ ...w, urlMasked: maskUrl(url) });

/** What a rate-limit key is about: the user it names and/or the address it was counted for. */
function describeKey(key: string): { kind: string; userId: string | null; ipHash: string | null } {
  const kind = key.split(":")[0];
  const last = key.split(":").at(-1) ?? "";
  return {
    kind,
    userId: key.match(UUID_RE)?.[0] ?? null,
    ipHash: IP_KINDS.has(kind) && /^[a-f0-9]{64}$/.test(last) ? last : null,
  };
}

/** Adds `email` (when the key names a user) and `ipHash` (when it names an address) to rate-limit rows. */
async function withKeyDetails<T extends { key: string }>(rows: T[]) {
  const described = rows.map((r) => ({ ...r, ...describeKey(r.key) }));
  const emails = await adminRepository.emailsOf([...new Set(described.flatMap((r) => (r.userId ? [r.userId] : [])))]);
  return described.map((r) => ({ ...r, email: r.userId ? (emails.get(r.userId) ?? null) : null }));
}

/** Rewrites the Discord summaries of the sessions these logs belonged to. */
async function refreshSessions(entries: { ownerId: string; sessionId: string | null }[]): Promise<void> {
  const seen = new Set<string>();
  for (const { ownerId, sessionId } of entries) {
    if (!sessionId || seen.has(sessionId)) continue;
    seen.add(sessionId);
    await sessionService.refreshDiscord(ownerId, sessionId);
  }
}

/**
 * Everything the administrator can see and do, across all users. Only reachable through requireAdmin; the user-facing
 * services stay owner-scoped.
 */
export const adminService = {
  async overview(): Promise<AdminOverview> {
    const [totals, rateLimitEventsLast24h] = await Promise.all([
      adminRepository.overview(),
      rateLimitEventRepository.countSince(DAY_MS),
    ]);
    return { ...totals, rateLimitEventsLast24h };
  },

  /**
   * The overview's charts for the last `days` UTC days (today included): per day, totals against the period before,
   * and the leaders of the period. Days without activity are in the list with zeros.
   */
  async stats(days: AdminStatsDays): Promise<AdminStats> {
    const todayStart = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
    const from = new Date(todayStart.getTime() - (days - 1) * DAY_MS);
    const to = new Date(todayStart.getTime() + DAY_MS);
    const prevFrom = new Date(from.getTime() - days * DAY_MS);

    const [logsDaily, usersDaily, sessionsDaily, refusedDaily, newUsers, logs, kills, activeUsers, sessions, refused, byCategory, topBosses, topUploaders] =
      await Promise.all([
        stats.logsPerDay(from),
        stats.perDay("users", "created_at", from),
        stats.perDay("sessions", "started_at", from),
        stats.refusedPerDay(from),
        stats.newUsers(from, to, prevFrom),
        stats.logs(from, to, prevFrom),
        stats.kills(from, to),
        stats.activeUsers(from, to, prevFrom),
        stats.sessions(from, to, prevFrom),
        stats.refused(from, to, prevFrom),
        stats.logsByCategory(from),
        stats.topBosses(from, 10),
        stats.topUploaders(from, 10),
      ]);

    const daily = new Map<string, AdminStatsDay>();
    for (let i = 0; i < days; i++) {
      const date = new Date(from.getTime() + i * DAY_MS).toISOString().slice(0, 10);
      daily.set(date, { date, logs: 0, kills: 0, wipes: 0, activeUsers: 0, newUsers: 0, sessions: 0, refused: {} });
    }
    for (const r of logsDaily) {
      const d = daily.get(r.day);
      if (d) Object.assign(d, { logs: r.logs, kills: r.kills, wipes: r.logs - r.kills, activeUsers: r.uploaders });
    }
    for (const r of usersDaily) if (daily.has(r.day)) daily.get(r.day)!.newUsers = r.n;
    for (const r of sessionsDaily) if (daily.has(r.day)) daily.get(r.day)!.sessions = r.n;
    for (const r of refusedDaily) if (daily.has(r.day)) daily.get(r.day)!.refused[r.kind] = r.n;

    return {
      days,
      from,
      totals: { newUsers, logs, activeUsers, sessions, refused, kills: kills.kills },
      daily: [...daily.values()],
      byCategory,
      topBosses,
      topUploaders,
    };
  },

  // ---------- users

  users: (filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminUser>> =>
    adminRepository.users(filter, page, pageSize),

  async user(id: string): Promise<AdminUserDetail> {
    const user = await adminRepository.user(id);
    if (!user) throw userNotFound();
    const [ips, webhooks] = await Promise.all([
      userIpService.listForUser(id),
      adminRepository.webhooks({ search: "", userId: id }, 1, 10),
    ]);
    const blocked = await adminRepository.blockedAmong(ips.map((ip) => ip.ipHash));
    return {
      ...user,
      ips: ips.map((ip) => ({ ...ip, blocked: blocked.has(ip.ipHash) })),
      webhooks: webhooks.rows.map(toAdminWebhook),
    };
  },

  /** Blocks signing in and signs the user out everywhere (website, uploader, addon). */
  async blockUser(id: string, reason: string): Promise<void> {
    if (!(await adminRepository.setBlocked(id, { at: new Date(), reason }))) throw userNotFound();
  },

  async unblockUser(id: string): Promise<void> {
    if (!(await adminRepository.setBlocked(id, null))) throw userNotFound();
  },

  /** Marks the email as confirmed, so the user can sign in without the link from the email. */
  async verifyUser(id: string): Promise<void> {
    if (!(await adminRepository.verifyEmail(id))) throw userNotFound();
  },

  async signOutUser(id: string): Promise<void> {
    if (!(await adminRepository.signOutEverywhere(id))) throw userNotFound();
  },

  /** Deletes the account with its logs, sessions and webhooks. */
  async deleteUser(id: string): Promise<void> {
    if (!(await userRepository.delete(id))) throw userNotFound();
  },

  // ---------- logs

  logs: (filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminLog>> =>
    adminRepository.logs(filter, page, pageSize),

  /** Deletes the logs; the Discord summaries of their (ended) sessions are rewritten without them. */
  async deleteLogs(ids: string[]): Promise<number> {
    const found = await adminRepository.findLogs([...new Set(ids)]);
    const deleted = await adminRepository.deleteLogs(found.map((l) => l.id));
    await refreshSessions(found);
    return deleted;
  },

  /** Creates (or keeps) the log's public link; with `shared` false it is revoked. */
  async setLogShared(id: string, shared: boolean): Promise<void> {
    if (!(await adminRepository.setLogShareToken(id, shared ? newShareToken() : null))) throw logNotFound();
  },

  /** Puts the log into a session of the same user, or with null takes it out of its session. */
  async setLogSession(id: string, sessionId: string | null): Promise<void> {
    const [log] = await adminRepository.findLogs([id]);
    if (!log) throw logNotFound();
    if (sessionId) {
      const session = await adminRepository.findSession(sessionId);
      if (!session) throw sessionNotFound();
      if (session.ownerId !== log.ownerId) throw validationError("The session belongs to another user.");
    }
    await adminRepository.setLogSession(id, sessionId);
    await refreshSessions([log, { ownerId: log.ownerId, sessionId }]);
  },

  // ---------- sessions

  sessions: (filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminSession>> =>
    adminRepository.sessions(filter, page, pageSize),

  /** Deletes the sessions; their logs are kept, without a session. */
  deleteSessions: (ids: string[]) => adminRepository.deleteSessions([...new Set(ids)]),

  async setSessionShared(id: string, shared: boolean): Promise<void> {
    if (!(await adminRepository.setSessionShareToken(id, shared ? newShareToken() : null))) throw sessionNotFound();
  },

  // ---------- Discord webhooks

  async webhooks(filter: AdminListFilter, page: number, pageSize: number): Promise<AdminPage<AdminWebhook>> {
    const { rows, total } = await adminRepository.webhooks(filter, page, pageSize);
    return { rows: rows.map(toAdminWebhook), total };
  },

  /**
   * Pauses / resumes a webhook or changes what it posts. With two webhooks, each posts only logs or only sessions
   * (the same rule as the settings page).
   */
  async updateWebhook(id: string, patch: { enabled?: boolean; content?: DiscordContent }): Promise<void> {
    const hook = await adminRepository.webhookWithSiblings(id);
    if (!hook) throw webhookNotFound();
    if (patch.content === "all" && hook.all.length > 1) {
      throw validationError("With two webhooks, each posts only logs or only sessions.");
    }
    await adminRepository.updateWebhook(id, patch);
  },

  async deleteWebhook(id: string): Promise<void> {
    if (!(await adminRepository.deleteWebhook(id))) throw webhookNotFound();
  },

  // ---------- blocked addresses

  blockedIps: () => blockedIpService.list(),
  blockIp: (ipHash: string, note: string) => blockedIpService.block(ipHash, note),

  async unblockIp(ipHash: string): Promise<void> {
    await blockedIpService.unblock(ipHash);
  },

  // ---------- rate limits

  /** Refused requests per kind (24 h / 7 days), the keys refused most in 24 h and the counters running now. */
  async rateLimits() {
    const [byKind, topKeys, active] = await Promise.all([
      rateLimitEventRepository.byKind(),
      rateLimitEventRepository.topKeys(50),
      rateLimitEventRepository.active(100),
    ]);
    return { byKind, topKeys: await withKeyDetails(topKeys), active: await withKeyDetails(active) };
  },

  async rateLimitEvents(kind: string | null, page: number, pageSize: number) {
    const { rows, total } = await rateLimitEventRepository.page(kind, page, pageSize);
    return { rows: await withKeyDetails(rows), total };
  },
};
