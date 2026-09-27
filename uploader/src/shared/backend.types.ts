// Subset of the GW2 ArcDPS Helper backend contract (see backend/src/types) that the uploader uses.

export interface BackendUser {
  id: string;
  email: string;
  gw2Account: string;
  /** dps.report user token, set on the website (Profile); null = anonymous uploads. */
  dpsReportToken: string | null;
}

/** A group of logs recorded together (see backend sessions). endedAt is null while it is active. */
export interface BackendSession {
  id: string;
  name: string;
  startedAt: string;
  endedAt: string | null;
  /** "expired" when it was ended automatically after 6 hours (it can then be resumed). */
  endReason: "manual" | "expired" | null;
  /** When an active session is ended automatically. */
  expiresAt: string;
}

export interface AuthResponse {
  token: string;
  user: BackendUser;
}

export interface BackendGroup {
  id: string;
  name: string;
  short: string;
  category: "raid" | "fractal" | "strike" | "other";
}

export interface BackendLog {
  id: string;
  permalink: string;
  url: string;
  bossName: string;
  encounterKey: string | null;
  groupId: string | null;
  category: BackendGroup["category"];
  success: boolean;
  isCM: boolean;
  isLegendaryCM: boolean;
  durationMs: number;
  encounterTime: string;
}

export type BackendSubmitResult =
  | { url: string; status: "ok" | "duplicate"; logId: string; log: BackendLog; group: BackendGroup | null }
  | { url: string; status: "error"; code: string; message: string };

export interface BackendErrorBody {
  error?: string;
  code?: string;
}
