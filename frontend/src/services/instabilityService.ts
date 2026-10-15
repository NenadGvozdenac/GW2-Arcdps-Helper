import type { Language } from "../i18n/i18n.types";
import type {
  DailyFractal,
  FractalInstabilities,
  Instability,
  InstabilityData,
  InstabilityFractals,
} from "../domain/types/instability.types";
import { encounterService } from "./encounterService";

const NO_PAIN_NO_GAIN = "No Pain, No Gain";
const LAST_LAUGH = "Last Laugh";

/** The fractal level of each CM fractal group. */
const CM_LEVELS: Record<string, number> = {
  lonelytower: 100,
  silentsurf: 99,
  sunqua: 98,
  shattered: 97,
  nightmare: 96,
  kinfall: 95,
  solitarythrone: 94,
};

/** Tier 4 fractals are levels 76–100. */
const T4_MIN_LEVEL = 76;

/** The daily fractals' types on day `day` (see `dayIndex`); a 15-day rotation. */
const dailyTypesAt = (data: InstabilityData, day: number): string[] => data.dailies[day % data.dailies.length] ?? [];

/** Every level the daily fractals are played at on day `day`. */
const dailyLevelsAt = (data: InstabilityData, day: number): number[] =>
  dailyTypesAt(data, day).flatMap((type) => data.fractal_details[type]?.scales ?? []);

/** A fractal level's instabilities on day `day` (see `dayIndex`). */
function instabilitiesAt(data: InstabilityData, level: number, day: number, lang: Language): Instability[] {
  const ids = data.instabilities[String(level)]?.[day] ?? [];
  return ids.map((id) => {
    const name = data.instability_details[id]?.name;
    return {
      id,
      name: (lang === "de" ? name?.de : name?.en) ?? "?",
      icon: `/icons/instabilities/${slug(name?.en ?? "")}.png`,
      isNoPainNoGain: name?.en === NO_PAIN_NO_GAIN,
      highlight: name?.en === NO_PAIN_NO_GAIN ? "danger" : name?.en === LAST_LAUGH ? "warning" : null,
    };
  });
}

/** "No Pain, No Gain" → "no-pain-no-gain", the icon's file name. */
const slug = (name: string) => name.toLowerCase().replace(/[^a-z]+/g, "-").replace(/^-|-$/g, "");

/** Stand for the daily and the recommended fractals in a play order (the other entries are CM fractal levels). */
export const PLAY_ORDER_DAILIES = 0;
export const PLAY_ORDER_RECS = -1;

/** The order the fractals are usually played in; each user can change theirs (and leave some out) in the settings. */
export const DEFAULT_PLAY_ORDER = [100, 99, 98, 95, 97, 96, 94, PLAY_ORDER_DAILIES, PLAY_ORDER_RECS];

export const instabilityService = {
  /**
   * Today's index into the data (UTC, fractals reset at 00:00 UTC): the day of year counted as in a leap year, so
   * 1 March is 60 every year and 59 (29 February) is skipped in other years.
   */
  dayIndex(now = new Date()): number {
    return (Date.UTC(2000, now.getUTCMonth(), now.getUTCDate()) - Date.UTC(2000, 0, 1)) / 86_400_000;
  },

  /** Each CM fractal (100 → 94) with today's instabilities. */
  forToday(data: InstabilityData, lang: Language, now = new Date()): FractalInstabilities[] {
    const day = instabilityService.dayIndex(now);
    const dailyLevels = new Set(dailyLevelsAt(data, day));
    return encounterService
      .groupsFor("fractal")
      .filter((group) => CM_LEVELS[group.id] != null)
      .map((group) => {
        const level = CM_LEVELS[group.id];
        const instabilities = instabilitiesAt(data, level, day, lang);
        return {
          group,
          level,
          isDaily: dailyLevels.has(level),
          icon: encounterService.groupIcon(group.id),
          instabilities,
        };
      });
  },

  /** A CM fractal group's level (100 for Lonely Tower…), undefined for other groups. */
  levelOf: (groupId: string): number | undefined => CM_LEVELS[groupId],

  /** The CM fractal group at a level (Lonely Tower for 100…), undefined for other levels. */
  groupIdOf: (level: number): string | undefined => Object.keys(CM_LEVELS).find((id) => CM_LEVELS[id] === level),

  /**
   * The user's play order (CM levels, PLAY_ORDER_DAILIES, PLAY_ORDER_RECS), or the default one; the dailies and recs
   * last when it has none.
   */
  playOrder(order: number[] | null | undefined): number[] {
    const entries = order ?? DEFAULT_PLAY_ORDER;
    return [...entries, ...[PLAY_ORDER_DAILIES, PLAY_ORDER_RECS].filter((e) => !entries.includes(e))];
  },

  /** The play order without the entries the user left out: what "Play order" shows. */
  playSequence: (order: number[] | null | undefined, hidden: number[] | undefined): number[] =>
    instabilityService.playOrder(order).filter((e) => !hidden?.includes(e)),

  /**
   * Today's daily fractals at their Tier 4 levels, highest level first, with their instabilities. A daily played at a CM
   * level (e.g. Silent Surf at 99) is left out: it is already among the CM fractals, marked as daily.
   */
  dailyT4(data: InstabilityData, lang: Language, now = new Date()): DailyFractal[] {
    const day = instabilityService.dayIndex(now);
    const cmLevels = new Set(Object.values(CM_LEVELS));
    return dailyTypesAt(data, day)
      .flatMap((type) => {
        const details = data.fractal_details[type];
        if (!details) return [];
        const name = (lang === "de" ? details.name.de : details.name.en) ?? type;
        return details.scales
          .filter((level) => level >= T4_MIN_LEVEL && !cmLevels.has(level))
          .map((level) => ({ type, name, level, instabilities: instabilitiesAt(data, level, day, lang) }));
      })
      .sort((a, b) => b.level - a.level);
  },

  /** Today's recommended fractals, highest level first, with their instabilities (none below level 26). */
  recommended(data: InstabilityData, lang: Language, now = new Date()): DailyFractal[] {
    const day = instabilityService.dayIndex(now);
    const recs = data.recommended[day % data.recommended.length] ?? [];
    return recs
      .map(({ scale: level }) => {
        const type = Object.keys(data.fractal_details).find((t) => data.fractal_details[t].scales.includes(level)) ?? "";
        const details = data.fractal_details[type];
        const name = (details && (lang === "de" ? details.name.de : details.name.en)) ?? type;
        return { type, name, level, instabilities: instabilitiesAt(data, level, day, lang) };
      })
      .sort((a, b) => b.level - a.level);
  },

  /**
   * The same, per instability: No Pain, No Gain first, Last Laugh next, then the others by name; only the ones some
   * fractal has.
   */
  byInstability(fractals: FractalInstabilities[]): InstabilityFractals[] {
    const map = new Map<number, InstabilityFractals>();
    for (const f of fractals) {
      for (const instability of f.instabilities) {
        const entry = map.get(instability.id) ?? { instability, fractals: [] };
        entry.fractals.push(f);
        map.set(instability.id, entry);
      }
    }
    const rank = (i: Instability) => (i.highlight === "danger" ? 0 : i.highlight === "warning" ? 1 : 2);
    return [...map.values()].sort(
      (a, b) =>
        rank(a.instability) - rank(b.instability) || a.instability.name.localeCompare(b.instability.name),
    );
  },
};
