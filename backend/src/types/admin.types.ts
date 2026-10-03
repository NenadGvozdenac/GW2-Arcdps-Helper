import type { DiscordContent } from "./discord.types";
import type { Category } from "./encounter.types";
import type { SessionEndReason } from "./session.types";

/** One page of an admin list. */
export interface AdminPage<T> {
  rows: T[];
  total: number;
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
  /** Last sign-in we know of (from user_ips). */
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
  category: Category;
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
  endReason: SessionEndReason | null;
  shareToken: string | null;
  logCount: number;
}

export interface AdminWebhook {
  id: string;
  userId: string;
  ownerEmail: string;
  position: number;
  /** The URL with its secret part cut short - enough to recognise it, not to post to it. */
  urlMasked: string;
  content: DiscordContent;
  enabled: boolean;
  accounts: string[];
  minAccounts: number;
  createdAt: Date;
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

/** Filters of the admin lists (all optional). */
export interface AdminListFilter {
  search: string;
  userId?: string;
  sessionId?: string;
}
