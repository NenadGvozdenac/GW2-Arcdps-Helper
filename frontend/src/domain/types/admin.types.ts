/** The admin area's data (see backend/src/types/admin.types.ts). Dates are Date objects. */

export interface AdminPage<T> {
  rows: T[];
  total: number;
}

export interface AdminListQuery {
  search: string;
  page: number;
  userId?: string;
  sessionId?: string;
}

export interface AdminOverview {
  users: number;
  verifiedUsers: number;
  blockedUsers: number;
  logs: number;
  logsLast24h: number;
  sessions: number;
  activeSessions: number;
  webhooks: number;
  blockedIps: number;
  rateLimitEventsLast24h: number;
}

export interface AdminUser {
  id: string;
  email: string;
  gw2Account: string;
  emailVerifiedAt: Date | null;
  createdAt: Date;
  blockedAt: Date | null;
  blockedReason: string | null;
  logCount: number;
  sessionCount: number;
  webhookCount: number;
  lastSeenAt: Date | null;
}

export interface AdminUserIp {
  ipHash: string;
  firstSeenAt: Date;
  lastSeenAt: Date;
  blocked: boolean;
}

export interface AdminUserDetail extends AdminUser {
  ips: AdminUserIp[];
  webhooks: AdminWebhook[];
}

export interface AdminLog {
  id: string;
  ownerId: string;
  ownerEmail: string;
  bossName: string;
  bossIcon: string | null;
  category: string;
  groupId: string | null;
  success: boolean;
  isCM: boolean;
  isLegendaryCM: boolean;
  durationMs: number;
  encounterTime: Date;
  uploadedAt: Date;
  url: string;
  sessionId: string | null;
  sessionName: string | null;
  shareToken: string | null;
}

export interface AdminSession {
  id: string;
  ownerId: string;
  ownerEmail: string;
  name: string;
  startedAt: Date;
  endedAt: Date | null;
  endReason: "manual" | "expired" | null;
  shareToken: string | null;
  logCount: number;
}

export type AdminWebhookContent = "all" | "logs" | "sessions";

export interface AdminWebhook {
  id: string;
  userId: string;
  ownerEmail: string;
  position: number;
  urlMasked: string;
  content: AdminWebhookContent;
  enabled: boolean;
  accounts: string[];
  minAccounts: number;
  createdAt: Date;
}

export interface AdminBlockedIp {
  ipHash: string;
  note: string;
  blockedAt: Date;
  users: string[];
}

/** A rate-limit key with what it points at: a user (by id → email) and / or an address hash. */
export interface AdminRateLimitKey {
  key: string;
  kind: string;
  userId: string | null;
  email: string | null;
  ipHash: string | null;
}

export interface AdminRateLimits {
  byKind: { kind: string; last24h: number; last7d: number }[];
  topKeys: (AdminRateLimitKey & { refused: number; lastAt: Date })[];
  active: (AdminRateLimitKey & { count: number; expiresAt: Date })[];
}

export type AdminRateLimitEvent = AdminRateLimitKey & { id: string; createdAt: Date };
