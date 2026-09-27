// Subset of the GW2 ArcDPS Helper backend contract (see backend/src/types) that the uploader uses.

export interface BackendUser {
  id: string;
  email: string;
  gw2Account: string;
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
