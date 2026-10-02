import type { BOON_IDS } from "../config/constants";
import type { Category } from "./encounter.types";

export type Boon = keyof typeof BOON_IDS;

/** Uptime per boon over the fight: % for most boons, average stacks for might and stability. Missing = never had it. */
export type BoonUptimes = Partial<Record<Boon, number>>;

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
  /** Breakbar (CC) damage against everything; missing on logs imported before it was stored. */
  breakbar?: number;
  /** Damage taken; missing on logs imported before it was stored. */
  damageTaken?: number;
  /** Boon uptimes; {} when the log has no Elite Insights data to read them from. */
  boons?: BoonUptimes;
  /**
   * Boons this player generated for their subgroup (% of the subgroup's uptime, stacks for might / stability) — shows
   * who provided quickness / alacrity. {} when the log has no Elite Insights data.
   */
  generation?: BoonUptimes;
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
  /** Secret of the public link (/shared/logs/<token>); null = not shared. */
  shareToken: string | null;
}

/**
 * A log in lists (GET /logs, GET /logs/search): everything except the squad. The squad is by far the biggest part of a
 * log and only the log page needs it (GET /logs/:id), so lists stay small even with thousands of logs.
 */
export type LogListItem = Omit<Log, "players" | "accounts">;

/** A log as shown on a public shared page (without internal owner / session ids or its share secret). */
export type SharedLog = Omit<Log, "ownerId" | "sessionId" | "shareToken">;

/** GET /shared/logs/:token — a log anyone with the link may view. */
export interface SharedLogResponse {
  log: SharedLog;
  /** GW2 account of the player who shared it (empty if they haven't set one). */
  owner: string;
}


export interface LogFilter {
  search: string;
  category: Category | "all";
  groupId: string | "all";
  result: "all" | "kill" | "wipe";
}

/** One page of the owner's logs matching a filter, newest first. */
export interface LogPage {
  logs: LogListItem[];
  /** How many logs match the filter in total. */
  total: number;
}
