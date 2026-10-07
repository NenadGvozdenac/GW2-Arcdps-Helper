// What the build editor reads from the official GW2 API (professions, specializations, traits, skills…) and from the
// generated catalog (domain/data/gw2Catalog.json: stat combinations, slot scaling, runes, sigils, relics, food…).

/** API attribute names as they come in itemstats / infusions. */
export type Gw2Attribute =
  | "Power"
  | "Precision"
  | "Toughness"
  | "Vitality"
  | "CritDamage"
  | "ConditionDamage"
  | "ConditionDuration"
  | "BoonDuration"
  | "Healing"
  | "AgonyResistance";

export interface StatAttribute {
  attribute: Gw2Attribute;
  multiplier: number;
  value: number;
}

export interface CatalogItem {
  id: number;
  name: string;
  icon: string | null;
}

export interface Gw2Catalog {
  generatedAt: string;
  /** Each stat combination ("Berserker's") on armor / weapons ("gear") and on trinkets (with flat values). */
  stats: Record<string, { gear: StatAttribute[]; trinket: StatAttribute[] }>;
  slots: {
    /** By weight class ("Heavy"), then slot ("Helm"): the stat scaling and the armor's defense. */
    armor: Record<string, Record<string, { adjustment: number; defense: number; icon: string | null }>>;
    /** By weapon type as the item API names it ("Greatsword", "LongBow"). */
    weapons: Record<string, { adjustment: number; icon: string | null }>;
    /** "Amulet", "Ring", "Accessory", "Back". */
    trinkets: Record<string, { adjustment: number; icon: string | null }>;
  };
  runes: (CatalogItem & { bonuses: string[] })[];
  sigils: (CatalogItem & { description: string })[];
  relics: (CatalogItem & { description: string })[];
  food: (CatalogItem & { bonuses: string[] })[];
  utility: (CatalogItem & { bonuses: string[] })[];
  infusions: (CatalogItem & { attributes: { attribute: Gw2Attribute; value: number }[] })[];
}

export interface Gw2WeaponSkill {
  id: number;
  slot: string;
  offhand?: string;
  attunement?: string;
}

/** GET /v2/professions/:id (schema 2019-12-19). */
export interface Gw2Profession {
  id: string;
  name: string;
  /** Its number in build template codes. */
  code: number;
  icon: string;
  specializations: number[];
  weapons: Record<string, { specialization?: number; flags: string[]; skills: Gw2WeaponSkill[] }>;
  skills: { id: number; slot: string; type: string }[];
  /** [palette id, skill id]: how build template codes name skills. */
  skills_by_palette: [number, number][];
}

export interface Gw2Specialization {
  id: number;
  name: string;
  profession: string;
  elite: boolean;
  icon: string;
  background: string;
  minor_traits: number[];
  /** Nine: three per tier (adept, master, grandmaster), in their order. */
  major_traits: number[];
}

export interface Gw2Trait {
  id: number;
  name: string;
  icon: string;
  description?: string;
  tier: number;
  order: number;
  slot: "Major" | "Minor";
}

export interface Gw2Skill {
  id: number;
  name: string;
  icon?: string;
  description?: string;
  slot?: string;
  type?: string;
  /** Elite specialization the skill needs (an id), if any. */
  specialization?: number;
}

/** A revenant legend: its skills are fixed. "Legend5" is 5 in build template codes. */
export interface Gw2Legend {
  id: string;
  swap: number;
  heal: number;
  elite: number;
  utilities: number[];
}

export interface Gw2Pet {
  id: number;
  name: string;
  icon: string;
}

/** Everything the editor needs for one profession, loaded once. */
export interface ProfessionData {
  profession: Gw2Profession;
  specializations: Gw2Specialization[];
  traits: Record<number, Gw2Trait>;
  skills: Record<number, Gw2Skill>;
  legends: Gw2Legend[];
  pets: Gw2Pet[];
}
