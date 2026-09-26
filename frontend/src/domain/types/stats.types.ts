import type { EncounterGroup } from "./encounter.types";

export interface EncounterStats {
  attempts: number;
  kills: number;
  wipes: number;
  cmKills: number;
  bestKillMs: number | null;
  bestCmKillMs: number | null;
  lastAttempt: Date | null;
  lastKill: Date | null;
}

export interface GroupClearProgress {
  group: EncounterGroup;
  cleared: number;
  total: number;
}
