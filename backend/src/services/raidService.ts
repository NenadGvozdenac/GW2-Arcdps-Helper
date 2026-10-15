import type { RaidWeek, RaidWeeklies } from "../types/raid.types";

/** The wings Emboldened and Call of the Mists rotate through, in release order (Visions of Eternity is not in it). */
const WINGS = ["w1", "w2", "w3", "w4", "w5", "w6", "w7", "w8"];

/**
 * A known week (GW2 wiki, "Raid"): from Monday 12 October 2026 08:30 UTC Emboldened was on W7 and Call of the Mists on
 * W8. Each week both move to the next wing; they change an hour after the weekly reset, on Monday at 08:30 UTC.
 */
const ANCHOR = Date.UTC(2026, 9, 12, 8, 30);
const EMBOLDENED_AT_ANCHOR = 6;
const CALL_OF_THE_MISTS_AT_ANCHOR = 7;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const wingAt = (index: number): string => WINGS[((index % WINGS.length) + WINGS.length) % WINGS.length];

export const raidService = {
  /** The raid week `now` is in and the `count - 1` after it. */
  weeklies(count: number, now = new Date()): RaidWeeklies {
    const current = Math.floor((now.getTime() - ANCHOR) / WEEK_MS);
    const weeks = Array.from({ length: count }, (_, i): RaidWeek => {
      const n = current + i;
      return {
        start: new Date(ANCHOR + n * WEEK_MS).toISOString(),
        end: new Date(ANCHOR + (n + 1) * WEEK_MS).toISOString(),
        emboldened: wingAt(EMBOLDENED_AT_ANCHOR + n),
        callOfTheMists: wingAt(CALL_OF_THE_MISTS_AT_ANCHOR + n),
      };
    });
    return { weeks };
  },
};
