import type { Category } from "./encounter.types";

export interface PlayerSummary {
  account: string;
  name: string;
  profession: string;
  group: number;
  /** DPS against the boss target(s). */
  dps: number;
  /** DPS against everything. */
  totalDps: number;
  downs: number;
  deaths: number;
  commander: boolean;
}

/** Parsed, storage-independent summary of a single dps.report log. */
export interface LogSummary {
  permalink: string;
  url: string;
  bossName: string;
  bossIcon: string | null;
  triggerId: number | null;
  encounterKey: string | null;
  groupId: string | null;
  category: Category;
  success: boolean;
  isCM: boolean;
  isLegendaryCM: boolean;
  durationMs: number;
  /** % of boss HP remaining (useful for wipes). */
  bossHealthLeft: number | null;
  encounterTime: Date;
  recordedBy: string | null;
  gw2Build: number | null;
  eliteInsightsVersion: string | null;
  players: PlayerSummary[];
  accounts: string[];
}

/** A stored log, as returned by the API. */
export interface Log extends LogSummary {
  id: string;
  ownerId: string;
  uploadedAt: Date;
  /** Session the log was recorded in (desktop uploader), or null. */
  sessionId: string | null;
}
