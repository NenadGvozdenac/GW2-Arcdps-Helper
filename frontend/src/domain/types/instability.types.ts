import type { EncounterGroup } from "./encounter.types";

/** Subsets of instabilities.json, dailies.json and fractals.json from Invisi/gw2-fotm-instabilities. */
export interface InstabilityData {
  /** Fractal level ("26"…"100") → one entry per day of a leap year (366) → indexes into `instability_details`. */
  instabilities: Record<string, number[][]>;
  instability_details: { name: { en: string; de: string } }[];
  /** The daily fractals' types on a 15-day rotation (index: day of year % 15). */
  dailies: string[][];
  /** The recommended fractals' levels on a 15-day rotation (index: day of year % 15). */
  recommended: { scale: number }[][];
  /** Fractal type → its name and the levels ("scales") it is played at. */
  fractal_details: Record<string, { name: { en: string; de: string }; scales: number[] }>;
}

export interface Instability {
  /** Index into `instability_details`. */
  id: number;
  name: string;
  /** public/icons/instabilities/<slug>.png (from the GW2 wiki). */
  icon: string;
  /** No Pain, No Gain: listed first when grouped by instability. */
  isNoPainNoGain: boolean;
  /** Shown in red (No Pain, No Gain) or yellow (Last Laugh); null for the rest. */
  highlight: InstabilityHighlight;
}

export type InstabilityHighlight = "danger" | "warning" | null;

/** A CM fractal and the instabilities it has today. */
export interface FractalInstabilities {
  group: EncounterGroup;
  level: number;
  /** Also one of today's dailies (then left out of the T4 dailies). */
  isDaily: boolean;
  /** The fractal's last (CM) boss's portrait (see `encounterService.groupIcon`). */
  icon: string;
  instabilities: Instability[];
}

/** One of today's daily fractals at its Tier 4 level (76–100), or a recommended fractal, with that level's instabilities. */
export interface DailyFractal {
  type: string;
  name: string;
  level: number;
  /** Played at a CM level (e.g. Silent Surf at 99): then shown among the CM fractals rather than the dailies. */
  isCmLevel: boolean;
  instabilities: Instability[];
}

/** An instability and the CM fractals that have it today. */
export interface InstabilityFractals {
  instability: Instability;
  fractals: FractalInstabilities[];
}

/** How the instabilities dialog lists them: per fractal (100 → 94), per instability, or per fractal in play order. */
export type InstabilityGroupBy = "fractal" | "instability" | "playOrder";

/** How the fractals page orders the fractals: by level (100 → 94) or in play order. */
export type FractalOrder = "fractal" | "playOrder";
