import type { Category } from "../domain/types/encounter.types";
import type { CmMode, Log } from "../domain/types/log.types";
import type { EncounterStats, GroupClearProgress } from "../domain/types/stats.types";
import { encounterService } from "./encounterService";

export const statsService = {
  encounterStats(logs: Log[]): EncounterStats {
    const s: EncounterStats = {
      attempts: logs.length,
      kills: 0,
      wipes: 0,
      cmKills: 0,
      bestKillMs: null,
      bestCmKillMs: null,
      lastAttempt: null,
      lastKill: null,
    };
    for (const l of logs) {
      if (!s.lastAttempt || l.encounterTime > s.lastAttempt) s.lastAttempt = l.encounterTime;
      if (!l.success) {
        s.wipes++;
        continue;
      }
      s.kills++;
      if (!s.lastKill || l.encounterTime > s.lastKill) s.lastKill = l.encounterTime;
      if (s.bestKillMs == null || l.durationMs < s.bestKillMs) s.bestKillMs = l.durationMs;
      if (l.isCM) {
        s.cmKills++;
        if (s.bestCmKillMs == null || l.durationMs < s.bestCmKillMs) s.bestCmKillMs = l.durationMs;
      }
    }
    return s;
  },

  /** Weekly reset: Monday 07:30 UTC. */
  lastWeeklyReset(now = new Date()): Date {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 30));
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    if (d > now) d.setUTCDate(d.getUTCDate() - 7);
    return d;
  },

  /** Daily reset: 00:00 UTC. */
  lastDailyReset(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  },

  /** Fractals reset daily, raids and strikes weekly. */
  resetFor(category: Category, now = new Date()): Date {
    return category === "fractal" ? statsService.lastDailyReset(now) : statsService.lastWeeklyReset(now);
  },

  /** When the current period ends: tomorrow 00:00 UTC for fractals, next Monday 07:30 UTC for raids and strikes. */
  nextResetFor(category: Category, now = new Date()): Date {
    const d = statsService.resetFor(category, now);
    d.setUTCDate(d.getUTCDate() + (category === "fractal" ? 1 : 7));
    return d;
  },

  /** Start of the reset period before the current one: yesterday for fractals, last week for raids and strikes. */
  previousResetFor(category: Category, now = new Date()): Date {
    const d = statsService.resetFor(category, now);
    d.setUTCDate(d.getUTCDate() - (category === "fractal" ? 1 : 7));
    return d;
  },

  /** Logs recorded in [from, to), newest first. */
  logsBetween(logs: Log[], from: Date, to?: Date): Log[] {
    return logs
      .filter((l) => l.encounterTime >= from && (!to || l.encounterTime < to))
      .sort((a, b) => b.encounterTime.getTime() - a.encounterTime.getTime());
  },

  /** Groups logs of one category by encounter key, honouring the Normal/CM toggle. */
  logsByEncounter(logs: Log[], category: Category, mode: CmMode): Map<string, Log[]> {
    const map = new Map<string, Log[]>();
    for (const l of logs) {
      if (l.category !== category || !l.encounterKey) continue;
      if ((mode === "cm" && !l.isCM) || (mode === "normal" && l.isCM)) continue;
      const arr = map.get(l.encounterKey) ?? [];
      arr.push(l);
      map.set(l.encounterKey, arr);
    }
    return map;
  },

  /** Encounter keys killed at or after `since`. */
  clearedSince(logs: Log[], since: Date): Set<string> {
    return new Set(
      logs.filter((l) => l.success && l.encounterKey && l.encounterTime >= since).map((l) => l.encounterKey!),
    );
  },

  clearProgress(logs: Log[], category: Category, since: Date): GroupClearProgress[] {
    const cleared = statsService.clearedSince(logs.filter((l) => l.category === category), since);
    return encounterService
      .groupsFor(category)
      .filter((group) => !group.notInClear)
      .map((group) => {
        const bosses = encounterService.encountersInGroup(group.id);
        return { group, total: bosses.length, cleared: bosses.filter((b) => cleared.has(b.key)).length };
      });
  },
};
