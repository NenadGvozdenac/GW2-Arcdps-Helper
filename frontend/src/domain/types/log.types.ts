import type { BOONS } from "../data/boons";
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
  /** Breakbar (CC) damage; missing on logs imported before it was stored. */
  breakbar?: number;
  damageTaken?: number;
  /** {} or missing = no boon data for this log. */
  boons?: BoonUptimes;
  /** Boons this player generated for their subgroup (% of its uptime); {} or missing = no data. */
  generation?: BoonUptimes;
}

export type Boon = (typeof BOONS)[number];

/** Uptime over the fight: % for most boons, average stacks for might and stability. Missing = never had it. */
export type BoonUptimes = Partial<Record<Boon, number>>;

/**
 * A log as the lists carry it (GET /logs, GET /logs/search): everything but the squad, which only the log page needs
 * (see LogDetail) and which would make the lists many times larger.
 */
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
  /** Session the log was recorded in (desktop uploader), or null. */
  sessionId: string | null;
  /** Secret of the public link (/shared/logs/<token>); null = not shared. */
  shareToken: string | null;
}

/** A log with its squad (GET /logs/:id, shared logs and sessions). */
export interface LogDetail extends Log {
  players: PlayerSummary[];
  accounts: string[];
}

/** A log opened through its public share link. */
export interface SharedLog {
  log: LogDetail;
  /** GW2 account of the player who shared it (may be empty). */
  owner: string;
}

export type CmMode = "all" | "normal" | "cm";
export type ResultFilter = "all" | "kill" | "wipe";

export interface LogFilter {
  search: string;
  category: Category | "all";
  groupId: string | "all";
  result: ResultFilter;
}

/** One page of logs matching a filter (GET /logs/search), newest first. */
export interface LogPage {
  logs: Log[];
  /** How many logs match the filter in total. */
  total: number;
}
