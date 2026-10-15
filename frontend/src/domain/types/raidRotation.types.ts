import type { EncounterGroup } from "./encounter.types";

/** One raid week (Monday 08:30 UTC to the next): the wing with Emboldened mode and the one with Call of the Mists. */
export interface RaidWeek {
  start: Date;
  end: Date;
  emboldened: EncounterGroup;
  callOfTheMists: EncounterGroup;
}
