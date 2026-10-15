/** One raid week (Monday 08:30 UTC to the next): the wing with Emboldened mode and the one with Call of the Mists. */
export interface RaidWeek {
  /** ISO strings. */
  start: string;
  end: string;
  /** Wing group ids ("w1"…"w8"). */
  emboldened: string;
  callOfTheMists: string;
}

/** GET /raids/weeklies: the current raid week first, then the ones after it. */
export interface RaidWeeklies {
  weeks: RaidWeek[];
}
