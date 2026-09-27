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

export interface Log {
  id: string;
  ownerId: string;
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
  uploadedAt: Date | null;
  recordedBy: string | null;
  gw2Build: number | null;
  eliteInsightsVersion: string | null;
  players: PlayerSummary[];
  accounts: string[];
  /** Session the log was recorded in (desktop uploader), or null. */
  sessionId: string | null;
}

export type CmMode = "all" | "normal" | "cm";
export type ResultFilter = "all" | "kill" | "wipe";

export interface LogFilter {
  search: string;
  category: Category | "all";
  groupId: string | "all";
  result: ResultFilter;
}
