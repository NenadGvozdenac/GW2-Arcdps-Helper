/** Categories of a build, from its Snow Crows roles (and name). */
export const BUILD_CATEGORIES = ["healer", "dps", "bdps", "alac", "quickness", "power", "condition"] as const;
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

/** Snow Crows' last golem benchmark of a build (DPS); builds without one (most healers) have none. */
export interface BuildBenchmark {
  max: number;
  average: number;
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
  benchmark: BuildBenchmark | null;
  gear: BuildGear;
}

/** "snowcrows": a favorite Snow Crows build (a snapshot of its page); "custom": one the user made in the build editor. */
export const BUILD_KINDS = ["snowcrows", "custom"] as const;
export type BuildKind = (typeof BUILD_KINDS)[number];

/**
 * A build in the user's "My builds": a favorite Snow Crows build (a snapshot of its page) or one the user made.
 * A custom build has no url; `custom` holds its editor state (opaque to the server).
 */
export interface FavoriteBuild extends Omit<BuildDetails, "url"> {
  id: string;
  kind: BuildKind;
  url: string | null;
  custom: unknown;
  categories: BuildCategory[];
  /** When the snapshot was taken from Snow Crows. */
  fetchedAt: Date;
  /** The last refresh that found the build changed (equal to fetchedAt when the latest refresh did); null = never. */
  changedAt: Date | null;
  createdAt: Date;
}

/**
 * POST / PUT /builds/custom: a build made in the website's editor. The client renders its gear (in BuildGear's shape,
 * so it shows like any other build) and template; the server stores them as they come.
 */
export interface CustomBuildInput {
  name: string;
  profession: string;
  specialization: string;
  weapons: string;
  template: string | null;
  gear: Record<string, unknown>;
  categories: BuildCategory[];
  /** The editor's state, to edit the build again. */
  custom: Record<string, unknown>;
}
