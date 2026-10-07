import type { Profession } from "../types/customBuild.types";

/** Each profession's armor weight and health at level 80 before vitality (GW2 wiki: Health). */
export const PROFESSION_INFO: Record<Profession, { weight: "Heavy" | "Medium" | "Light"; baseHealth: number }> = {
  Guardian: { weight: "Heavy", baseHealth: 1645 },
  Warrior: { weight: "Heavy", baseHealth: 9212 },
  Revenant: { weight: "Heavy", baseHealth: 5922 },
  Engineer: { weight: "Medium", baseHealth: 5922 },
  Ranger: { weight: "Medium", baseHealth: 5922 },
  Thief: { weight: "Medium", baseHealth: 1645 },
  Elementalist: { weight: "Light", baseHealth: 1645 },
  Mesmer: { weight: "Light", baseHealth: 5922 },
  Necromancer: { weight: "Light", baseHealth: 9212 },
};

/** Professions by their number in build template codes. */
export const PROFESSION_BY_CODE: Record<number, Profession> = {
  1: "Guardian",
  2: "Warrior",
  3: "Engineer",
  4: "Ranger",
  5: "Thief",
  6: "Elementalist",
  7: "Mesmer",
  8: "Necromancer",
  9: "Revenant",
};

/** Weapon types (as the profession API names them) by their id in build template codes. */
export const WEAPON_CODES: Record<string, number> = {
  Axe: 5,
  Longbow: 35,
  Dagger: 47,
  Focus: 49,
  Greatsword: 50,
  Hammer: 51,
  Mace: 53,
  Pistol: 54,
  Rifle: 85,
  Scepter: 86,
  Shield: 87,
  Staff: 89,
  Sword: 90,
  Torch: 102,
  Warhorn: 103,
  Shortbow: 107,
  Spear: 265,
};

/** The item API's name of a weapon type where it differs from the profession API's (land spears are "Harpoon"s). */
export const WEAPON_ITEM_TYPE: Record<string, string> = {
  Longbow: "LongBow",
  Shortbow: "ShortBow",
  Spear: "Harpoon",
};

/** Underwater-only weapons, left out of the editor. */
export const AQUATIC_WEAPONS = new Set(["Trident", "Speargun", "Harpoon"]);
