import { ADMIN_PAGE_SIZE } from "../config/constants";
import type {
  AdminBlockedIp,
  AdminListQuery,
  AdminLog,
  AdminOverview,
  AdminPage,
  AdminRateLimitEvent,
  AdminRateLimits,
  AdminSession,
  AdminUser,
  AdminUserDetail,
  AdminWebhook,
  AdminWebhookContent,
} from "../domain/types/admin.types";
import { adminHttp } from "./httpClient";

/** JSON dates arrive as ISO strings: turns the named fields of a row into Dates (null stays null). */
function withDates<T>(row: Record<string, unknown>, keys: string[]): T {
  const out: Record<string, unknown> = { ...row };
  for (const key of keys) {
    const value = row[key];
    out[key] = typeof value === "string" ? new Date(value) : value;
  }
  return out as T;
}

const USER_DATES = ["emailVerifiedAt", "createdAt", "blockedAt", "lastSeenAt"];
const LOG_DATES = ["encounterTime", "uploadedAt"];
const SESSION_DATES = ["startedAt", "endedAt"];
const WEBHOOK_DATES = ["createdAt"];

function listQuery(q: AdminListQuery): string {
  const params = new URLSearchParams({ search: q.search, page: String(q.page), pageSize: String(ADMIN_PAGE_SIZE) });
  if (q.userId) params.set("userId", q.userId);
  if (q.sessionId) params.set("sessionId", q.sessionId);
  return params.toString();
}

async function page<T>(path: string, q: AdminListQuery, dates: string[]): Promise<AdminPage<T>> {
  const body = await adminHttp.get<{ rows: Record<string, unknown>[]; total: number }>(`${path}?${listQuery(q)}`);
  return { rows: body.rows.map((r) => withDates<T>(r, dates)), total: body.total };
}

const id = (value: string) => encodeURIComponent(value);

export const adminRepository = {
  login: (email: string, password: string, code: string) =>
    adminHttp.post<{ token: string }>("/admin/auth/login", { email, password, code }),
  me: () => adminHttp.get<{ email: string }>("/admin/auth/me"),
  overview: () => adminHttp.get<AdminOverview>("/admin/overview"),

  users: (q: AdminListQuery) => page<AdminUser>("/admin/users", q, USER_DATES),
  async user(userId: string): Promise<AdminUserDetail> {
    const { user } = await adminHttp.get<{ user: Record<string, unknown> & { ips: Record<string, unknown>[]; webhooks: Record<string, unknown>[] } }>(
      `/admin/users/${id(userId)}`,
    );
    return {
      ...withDates<AdminUser>(user, USER_DATES),
      ips: user.ips.map((ip) => withDates(ip, ["firstSeenAt", "lastSeenAt"])),
      webhooks: user.webhooks.map((w) => withDates<AdminWebhook>(w, WEBHOOK_DATES)),
    };
  },
  blockUser: (userId: string, reason: string) => adminHttp.post<void>(`/admin/users/${id(userId)}/block`, { reason }),
  unblockUser: (userId: string) => adminHttp.post<void>(`/admin/users/${id(userId)}/unblock`),
  signOutUser: (userId: string) => adminHttp.post<void>(`/admin/users/${id(userId)}/sign-out`),
  deleteUser: (userId: string) => adminHttp.delete(`/admin/users/${id(userId)}`),

  logs: (q: AdminListQuery) => page<AdminLog>("/admin/logs", q, LOG_DATES),
  deleteLogs: (ids: string[]) => adminHttp.post<{ deleted: number }>("/admin/logs/delete", { ids }),
  setLogShared: (logId: string, shared: boolean) => adminHttp.put<void>(`/admin/logs/${id(logId)}/shared`, { shared }),
  setLogSession: (logId: string, sessionId: string | null) =>
    adminHttp.put<void>(`/admin/logs/${id(logId)}/session`, { sessionId }),

  sessions: (q: AdminListQuery) => page<AdminSession>("/admin/sessions", q, SESSION_DATES),
  deleteSessions: (ids: string[]) => adminHttp.post<{ deleted: number }>("/admin/sessions/delete", { ids }),
  setSessionShared: (sessionId: string, shared: boolean) =>
    adminHttp.put<void>(`/admin/sessions/${id(sessionId)}/shared`, { shared }),

  webhooks: (q: AdminListQuery) => page<AdminWebhook>("/admin/webhooks", q, WEBHOOK_DATES),
  updateWebhook: (webhookId: string, patch: { enabled?: boolean; content?: AdminWebhookContent }) =>
    adminHttp.patch<void>(`/admin/webhooks/${id(webhookId)}`, patch),
  deleteWebhook: (webhookId: string) => adminHttp.delete(`/admin/webhooks/${id(webhookId)}`),

  async blockedIps(): Promise<AdminBlockedIp[]> {
    const { ips } = await adminHttp.get<{ ips: Record<string, unknown>[] }>("/admin/blocked-ips");
    return ips.map((ip) => withDates<AdminBlockedIp>(ip, ["blockedAt"]));
  },
  blockIp: (ipHash: string, note: string) => adminHttp.post<void>("/admin/blocked-ips", { ipHash, note }),
  unblockIp: (ipHash: string) => adminHttp.delete(`/admin/blocked-ips/${id(ipHash)}`),

  async rateLimits(): Promise<AdminRateLimits> {
    const body = await adminHttp.get<{ byKind: AdminRateLimits["byKind"]; topKeys: Record<string, unknown>[]; active: Record<string, unknown>[] }>(
      "/admin/rate-limits",
    );
    return {
      byKind: body.byKind,
      topKeys: body.topKeys.map((k) => withDates(k, ["lastAt"])),
      active: body.active.map((k) => withDates(k, ["expiresAt"])),
    };
  },
  async rateLimitEvents(kind: string | null, pageNumber: number): Promise<AdminPage<AdminRateLimitEvent>> {
    const params = new URLSearchParams({ page: String(pageNumber), pageSize: String(ADMIN_PAGE_SIZE) });
    if (kind) params.set("kind", kind);
    const body = await adminHttp.get<{ rows: Record<string, unknown>[]; total: number }>(`/admin/rate-limits/events?${params}`);
    return { rows: body.rows.map((r) => withDates<AdminRateLimitEvent>(r, ["createdAt"])), total: body.total };
  },
};
