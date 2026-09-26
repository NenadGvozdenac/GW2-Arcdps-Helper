export type Category = "raid" | "fractal" | "strike" | "other";

export interface EncounterGroup {
  id: string;
  name: string;
  short: string;
  category: Category;
}

export interface Encounter {
  key: string;
  name: string;
  group: string;
  /** Elite Insights trigger IDs (`triggerID` in the dps.report JSON). */
  ids: number[];
  /** Lowercase name fragments used when the trigger ID is unknown. */
  aliases: string[];
}

export interface EncounterClassification {
  encounterKey: string | null;
  groupId: string | null;
  category: Category;
}
