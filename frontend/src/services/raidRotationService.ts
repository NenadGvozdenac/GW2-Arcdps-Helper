import type { EncounterGroup } from "../domain/types/encounter.types";
import type { RaidWeek } from "../domain/types/raidRotation.types";
import { raidRepository } from "../repositories/raidRepository";
import { encounterService } from "./encounterService";

const wing = (id: string): EncounterGroup =>
  encounterService.groupById(id) ?? { id, short: id.toUpperCase(), name: id, category: "raid" };

export const raidRotationService = {
  /** The raid week now and the `count - 1` after it: which wings have Emboldened and Call of the Mists. */
  async weeks(count: number): Promise<RaidWeek[]> {
    const weeks = await raidRepository.weeklies(count);
    return weeks.map((w) => ({
      start: new Date(w.start),
      end: new Date(w.end),
      emboldened: wing(w.emboldened),
      callOfTheMists: wing(w.callOfTheMists),
    }));
  },
};
