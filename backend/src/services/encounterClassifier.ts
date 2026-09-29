import { ENCOUNTERS, GROUPS } from "../data/encounters";
import type { Encounter, EncounterClassification } from "../types/encounter.types";

const encounterById = new Map<number, Encounter>();
for (const e of ENCOUNTERS) for (const id of e.ids) encounterById.set(id, e);

// Longer aliases first so "qadim the peerless" wins over "qadim", "cerus and deimos" over "deimos", etc.
const aliases = ENCOUNTERS.flatMap((e) => e.aliases.map((alias) => ({ alias, e }))).sort(
  (a, b) => b.alias.length - a.alias.length,
);

export function findEncounter(triggerId: number | null, name: string): Encounter | undefined {
  const lower = name.toLowerCase();
  // Convergences reuse raid names ("Convergence: Nexus of Eternity") but aren't in the catalogue.
  const byName = lower && !lower.includes("convergence") ? aliases.find((x) => lower.includes(x.alias))?.e : undefined;
  const byId = triggerId != null ? encounterById.get(triggerId) : undefined;
  if (byId) {
    // Trust the ID unless the name clearly points to a different wing/fractal/strike.
    return byName && byName.group !== byId.group ? byName : byId;
  }
  return byName;
}

export function classifyEncounter(triggerId: number | null, name: string): EncounterClassification {
  const encounter = findEncounter(triggerId, name);
  const group = encounter ? GROUPS.find((g) => g.id === encounter.group) : undefined;
  return {
    encounterKey: encounter?.key ?? null,
    groupId: group?.id ?? null,
    category: group?.category ?? "other",
  };
}
