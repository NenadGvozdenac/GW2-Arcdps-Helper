import { ENCOUNTERS, GROUPS } from "../data/encounters";
import { logRepository } from "../repositories/logRepository";
import type { WeeklyClears } from "../types/clears.types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Weekly reset: Monday 07:30 UTC (same as the website's statsService.lastWeeklyReset). */
export function lastWeeklyReset(now = new Date()): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 7, 30));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  if (d > now) d.setUTCDate(d.getUTCDate() - 7);
  return d;
}

export const clearsService = {
  /** Every raid wing (without seasonal groups) with the bosses killed since the weekly reset. */
  async weeklyRaids(userId: string, now = new Date()): Promise<WeeklyClears> {
    const resetAt = lastWeeklyReset(now);
    const cleared = new Set(await logRepository.killedEncounterKeysSince(userId, "raid", resetAt));
    return {
      resetAt: resetAt.toISOString(),
      nextResetAt: new Date(resetAt.getTime() + WEEK_MS).toISOString(),
      groups: GROUPS.filter((g) => g.category === "raid" && !g.notInClear).map((g) => ({
        id: g.id,
        short: g.short,
        name: g.name,
        bosses: ENCOUNTERS.filter((e) => e.group === g.id).map((e) => ({
          key: e.key,
          name: e.name,
          cleared: cleared.has(e.key),
        })),
      })),
    };
  },
};
