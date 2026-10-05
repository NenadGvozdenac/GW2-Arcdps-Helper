/** Categories of a build, from its Snow Crows roles (backend: BUILD_CATEGORIES). */
export type BuildCategory = "healer" | "dps" | "bdps" | "alac" | "quickness" | "power" | "condition";

export const BUILD_CATEGORIES: BuildCategory[] = ["healer", "dps", "bdps", "alac", "quickness", "power", "condition"];

/** The role categories (the role filter); the boon given and the damage type are filters of their own. */
export const ROLE_CATEGORIES: BuildCategory[] = ["healer", "dps", "bdps"];
export const BOON_TYPES = ["alac", "quickness"] as const satisfies BuildCategory[];
export type BoonType = (typeof BOON_TYPES)[number];
export const DAMAGE_TYPES = ["power", "condition"] as const satisfies BuildCategory[];
export type DamageType = (typeof DAMAGE_TYPES)[number];

/** A GW2 item (rune, sigil, infusion, food…) with its name and icon from the GW2 API. */
export interface GearItem {
  id: number;
  name: string;
  icon: string | null;
}

/** Armor piece or trinket: stat combination ("Berserker's") and slot ("Helm", "Ring"…); runes for armor. */
export interface GearPiece {
  slot: string;
  stat: string;
  upgrades: GearItem[];
}

export interface GearWeapon {
  /** "Primary" / "Secondary". */
  set: string;
  /** "Main Hand" / "Off Hand". */
  slot: string;
  /** "Berserker's Spear". */
  name: string;
  sigils: GearItem[];
}

export interface BuildGear {
  armor: GearPiece[];
  trinkets: GearPiece[];
  relic: GearItem | null;
  weapons: GearWeapon[];
  infusions: { item: GearItem; count: number }[];
  food: GearItem | null;
  utility: GearItem | null;
  jadeBotCore: GearItem | null;
}

/** A build found on Snow Crows (no gear yet). */
export interface BuildSearchResult {
  url: string;
  name: string;
  weapons: string;
  profession: string;
  specialization: string;
  /** Snow Crows roles: "Power DPS", "Quickness Giver", "Healer"… */
  roles: string[];
  /** From the roles and the name. */
  categories: BuildCategory[];
}

/** Snow Crows' last golem benchmark of a build (DPS); builds without one (most healers) have none. */
export interface BuildBenchmark {
  max: number;
  average: number;
}

/** A Snow Crows build page: template and gear. */
export interface BuildDetails {
  url: string;
  name: string;
  weapons: string;
  profession: string;
  specialization: string;
  /** In-game build template chat code; null if the page has none. */
  template: string | null;
  /** When Snow Crows last updated the build, as they write it ("May 29, 2026"). */
  updated: string | null;
  /** Null when the build has no benchmark (or the favorite was saved before benchmarks were read). */
  benchmark: BuildBenchmark | null;
  gear: BuildGear;
}

/** A build in the user's favorites (a snapshot of the page, refreshed on request); categories from its roles. */
export interface FavoriteBuild extends BuildDetails {
  id: string;
  categories: BuildCategory[];
  fetchedAt: Date;
  /** The last refresh that found the build changed; equal to fetchedAt when the latest refresh did. */
  changedAt: Date | null;
  createdAt: Date;
}

/** Result of refreshing every favorite: favorite ids that changed / could not be fetched. */
export interface FavoritesRefresh {
  builds: FavoriteBuild[];
  changed: string[];
  failed: string[];
}
