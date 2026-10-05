/** Categories of a build, from its Snow Crows roles (and name). */
export const BUILD_CATEGORIES = ["healer", "dps", "bdps", "alac", "quickness"] as const;
export type BuildCategory = (typeof BUILD_CATEGORIES)[number];

/** A GW2 item (rune, sigil, infusion, food…) with its name and icon from the official GW2 API. */
export interface GearItem {
  id: number;
  name: string;
  icon: string | null;
}

// Gear types take the item type as a parameter: the parser fills in GW2 item ids (numbers), which are then resolved
// to GearItem through the GW2 API.

/** Armor piece or trinket: its stat combination ("Berserker's") and slot ("Helm", "Ring"…). */
export interface GearPiece<I = GearItem> {
  slot: string;
  stat: string;
  /** Rune of an armor piece; empty for trinkets. */
  upgrades: I[];
}

export interface GearWeapon<I = GearItem> {
  /** "Primary" / "Secondary" weapon set (as Snow Crows names it, without "Weapon Set"). */
  set: string;
  /** "Main Hand" / "Off Hand". */
  slot: string;
  /** "Berserker's Spear". */
  name: string;
  sigils: I[];
}

/** Everything Snow Crows lists under "Gear" for a build. */
export interface BuildGear<I = GearItem> {
  armor: GearPiece<I>[];
  trinkets: GearPiece<I>[];
  relic: I | null;
  weapons: GearWeapon<I>[];
  infusions: { item: I; count: number }[];
  food: I | null;
  utility: I | null;
  jadeBotCore: I | null;
}

/** One build found by GET /builds/search (from the Snow Crows build list; no gear yet). */
export interface BuildSearchResult {
  url: string;
  name: string;
  /** "Spear / Dagger & Sword". */
  weapons: string;
  profession: string;
  specialization: string;
  /** Snow Crows roles: "Power DPS", "Quickness Giver", "Healer"… */
  roles: string[];
  /** From the roles and the name. */
  categories: BuildCategory[];
}

/** A build page of Snow Crows: GET /builds/details. */
export interface BuildDetails {
  url: string;
  name: string;
  weapons: string;
  profession: string;
  specialization: string;
  /** In-game build template chat code ("[&DQc…]"); null if the page has none. */
  template: string | null;
  /** When Snow Crows last updated the build, as they write it ("May 29, 2026"). */
  updated: string | null;
  gear: BuildGear;
}

/** A build in the user's favorites: a snapshot of the Snow Crows page and its categories. */
export interface FavoriteBuild extends BuildDetails {
  id: string;
  categories: BuildCategory[];
  /** When the snapshot was taken from Snow Crows. */
  fetchedAt: Date;
  /** The last refresh that found the build changed (equal to fetchedAt when the latest refresh did); null = never. */
  changedAt: Date | null;
  createdAt: Date;
}
