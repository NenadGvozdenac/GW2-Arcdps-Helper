import type { BuildCategory } from "./build.types";

export const PROFESSIONS = [
  "Guardian",
  "Warrior",
  "Revenant",
  "Engineer",
  "Ranger",
  "Thief",
  "Elementalist",
  "Mesmer",
  "Necromancer",
] as const;
export type Profession = (typeof PROFESSIONS)[number];

export const ARMOR_SLOTS = ["Helm", "Shoulders", "Coat", "Gloves", "Leggings", "Boots"] as const;
export type ArmorSlot = (typeof ARMOR_SLOTS)[number];

/** The two accessories and rings are separate slots (each can have its own stats). */
export const TRINKET_SLOTS = ["Back", "Accessory1", "Accessory2", "Amulet", "Ring1", "Ring2"] as const;
export type TrinketSlot = (typeof TRINKET_SLOTS)[number];

/** Infusion slots of a full ascended set: armor 6, back 2, accessories 2, rings 6, weapons 2. */
export const INFUSION_SLOTS = 18;

/** A weapon in a hand of a set; a two-handed weapon takes the set's main hand (and two sigils). */
export interface WeaponPick {
  /** As the profession API names it: "Greatsword", "Sword"… */
  type: string;
  stat: string;
  sigils: (number | null)[];
}

/** The build editor's state; saved with a custom build so it can be edited again. */
export interface CustomBuildData {
  version: 1;
  profession: Profession;
  /** Three lines; `traits`: the chosen major trait per tier (adept, master, grandmaster). */
  specializations: { id: number | null; traits: (number | null)[] }[];
  /** Skill ids (not used by revenants: their legends decide). */
  skills: { heal: number | null; utilities: (number | null)[]; elite: number | null };
  /** Revenant: two legends ("Legend5"…). */
  legends: (string | null)[];
  /** Ranger: two (terrestrial) pets. */
  pets: (number | null)[];
  /** Two weapon sets. */
  weapons: { main: WeaponPick | null; off: WeaponPick | null }[];
  armor: Record<ArmorSlot, { stat: string; rune: number | null }>;
  trinkets: Record<TrinketSlot, { stat: string }>;
  relic: number | null;
  food: number | null;
  utility: number | null;
  infusions: { id: number; count: number }[];
}

/** What the editor saves: the build's name and categories with its state. */
export interface CustomBuildDraft {
  name: string;
  categories: BuildCategory[];
  data: CustomBuildData;
}

/** Totals of the gear's attributes and what they make (as the hero panel shows them out of combat). */
export interface BuildAttributes {
  power: number;
  precision: number;
  toughness: number;
  vitality: number;
  ferocity: number;
  conditionDamage: number;
  expertise: number;
  concentration: number;
  healingPower: number;
  agonyResistance: number;
  /** Armor = toughness + the armor pieces' defense. */
  armor: number;
  health: number;
  /** In %. */
  critChance: number;
  critDamage: number;
  conditionDuration: number;
  boonDuration: number;
}
