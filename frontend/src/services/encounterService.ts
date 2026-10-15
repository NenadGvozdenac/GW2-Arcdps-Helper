import { ENCOUNTERS, GROUPS } from "../domain/data/encounters";
import type { Category, Encounter, EncounterGroup } from "../domain/types/encounter.types";

export const encounterService = {
  /** Every wing / fractal / strike in catalogue order (W1…W8, VoE, fractals, strikes). */
  allGroups: (): EncounterGroup[] => GROUPS,

  groupsFor: (category: Category): EncounterGroup[] => GROUPS.filter((g) => g.category === category),

  /** A wing's / fractal's / strike group's portrait: its (last) boss, from Elite Insights, in public/icons/groups/. */
  groupIcon: (id: string): string => `/icons/groups/${id}.png`,

  groupById: (id: string | null): EncounterGroup | undefined => (id ? GROUPS.find((g) => g.id === id) : undefined),

  encountersInGroup: (groupId: string): Encounter[] => ENCOUNTERS.filter((e) => e.group === groupId),

  encountersFor: (category: Category): Encounter[] => {
    const ids = new Set(encounterService.groupsFor(category).map((g) => g.id));
    return ENCOUNTERS.filter((e) => ids.has(e.group));
  },
};
