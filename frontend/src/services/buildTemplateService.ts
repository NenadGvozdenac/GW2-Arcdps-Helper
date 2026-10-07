import { PROFESSION_BY_CODE, WEAPON_CODES } from "../domain/data/professions";
import type { CustomBuildData, Profession } from "../domain/types/customBuild.types";
import type { ProfessionData } from "../domain/types/gw2.types";

// GW2 build template chat codes ("[&DQ…]"): 0x0D, the profession, three specializations with their trait choices,
// ten skill palette ids (heal, three utilities, elite — land and water each), 16 profession bytes (ranger pets,
// revenant legends) and, in newer codes, the weapons the build uses. Checked against Snow Crows' codes.

const HEADER = 0x0d;
const BASE_LENGTH = 44;

/** A template code read without the profession's data (palette ids, trait choices as 1–3). */
export interface ParsedTemplate {
  profession: Profession;
  specializations: { id: number; choices: number[] }[];
  /** Land skills as palette ids: heal, three utilities, elite. */
  palette: { heal: number; utilities: number[]; elite: number };
  /** Revenant: legend numbers (5 = "Legend5"); ranger: pet ids. */
  legends: number[];
  pets: number[];
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export const buildTemplateService = {
  /** Reads a template code; null when it isn't one. */
  parse(code: string): ParsedTemplate | null {
    const match = code.trim().match(/^\[&([A-Za-z0-9+/=]+)\]$/);
    if (!match) return null;
    let bytes: Uint8Array;
    try {
      bytes = fromBase64(match[1]);
    } catch {
      return null;
    }
    if (bytes.length < BASE_LENGTH || bytes[0] !== HEADER) return null;
    const profession = PROFESSION_BY_CODE[bytes[1]];
    if (!profession) return null;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const palette = (i: number) => view.getUint16(8 + i * 2, true);
    return {
      profession,
      specializations: [0, 1, 2].map((i) => {
        const bits = bytes[3 + i * 2];
        return { id: bytes[2 + i * 2], choices: [bits & 3, (bits >> 2) & 3, (bits >> 4) & 3] };
      }),
      palette: { heal: palette(0), utilities: [palette(2), palette(4), palette(6)], elite: palette(8) },
      legends: profession === "Revenant" ? [bytes[28], bytes[29]] : [],
      pets: profession === "Ranger" ? [bytes[28], bytes[29]] : [],
    };
  },

  /** A parsed code as the editor's specializations / skills / legends / pets, with the profession's data. */
  apply(parsed: ParsedTemplate, pd: ProfessionData): Pick<CustomBuildData, "specializations" | "skills" | "legends" | "pets"> {
    const skillOf = new Map(pd.profession.skills_by_palette.map(([palette, skill]) => [palette, skill]));
    const skill = (palette: number) => (palette ? (skillOf.get(palette) ?? null) : null);
    return {
      specializations: parsed.specializations.map(({ id, choices }) => {
        const spec = pd.specializations.find((s) => s.id === id);
        return {
          id: spec ? id : null,
          traits: choices.map((choice, tier) => (spec && choice ? (spec.major_traits[tier * 3 + choice - 1] ?? null) : null)),
        };
      }),
      skills: {
        heal: skill(parsed.palette.heal),
        utilities: parsed.palette.utilities.map(skill),
        elite: skill(parsed.palette.elite),
      },
      legends: parsed.legends.map((n) => (n ? `Legend${n}` : null)),
      pets: parsed.pets.map((n) => n || null),
    };
  },

  /** The build's template code; null until it has its three specializations. */
  encode(data: CustomBuildData, pd: ProfessionData): string | null {
    if (data.specializations.some((s) => !s.id)) return null;
    const ext = [...new Set(data.weapons.flatMap((s) => [s.main?.type, s.off?.type]))]
      .map((t) => (t ? WEAPON_CODES[t] : undefined))
      .filter((c): c is number => !!c);
    const bytes = new Uint8Array(BASE_LENGTH + 1 + ext.length * 2 + 1);
    const view = new DataView(bytes.buffer);
    bytes[0] = HEADER;
    bytes[1] = pd.profession.code;

    data.specializations.forEach((line, i) => {
      const spec = pd.specializations.find((s) => s.id === line.id);
      bytes[2 + i * 2] = line.id ?? 0;
      let bits = 0;
      line.traits.forEach((trait, tier) => {
        const index = spec && trait ? spec.major_traits.slice(tier * 3, tier * 3 + 3).indexOf(trait) : -1;
        if (index >= 0) bits |= (index + 1) << (tier * 2);
      });
      bytes[3 + i * 2] = bits;
    });

    const paletteOf = new Map<number, number>();
    for (const [palette, skill] of pd.profession.skills_by_palette) if (!paletteOf.has(skill)) paletteOf.set(skill, palette);
    const palette = (skill: number | null | undefined) => (skill ? (paletteOf.get(skill) ?? 0) : 0);
    // Revenants: the skills are the legends'. Only one legend's skills have palette ids, and those stand for the bar's
    // slots (heal, utilities, elite) whatever the legend: use them for the slots, for both legends.
    const slotLegend = pd.legends.find((l) => paletteOf.has(l.heal));
    const skills =
      data.profession === "Revenant"
        ? {
            heal: slotLegend?.heal ?? null,
            utilities: slotLegend?.utilities ?? [],
            elite: slotLegend?.elite ?? null,
          }
        : data.skills;
    [skills.heal, ...[0, 1, 2].map((i) => skills.utilities[i]), skills.elite].forEach((skill, i) => {
      view.setUint16(8 + i * 4, palette(skill), true); // land
      view.setUint16(10 + i * 4, palette(skill), true); // water: the same
    });

    if (data.profession === "Ranger") {
      bytes.set([data.pets[0] ?? 0, data.pets[1] ?? 0, data.pets[0] ?? 0, data.pets[1] ?? 0], 28);
    } else if (data.profession === "Revenant") {
      const code = (id: string | null | undefined) => Number(id?.replace("Legend", "") ?? 0) || 0;
      bytes.set([code(data.legends[0]), code(data.legends[1])], 28);
      // The other legend's utility slots.
      skills.utilities.forEach((skill, i) => view.setUint16(32 + i * 2, palette(skill), true));
    }

    bytes[BASE_LENGTH] = ext.length;
    ext.forEach((code, i) => view.setUint16(BASE_LENGTH + 1 + i * 2, code, true));
    bytes[BASE_LENGTH + 1 + ext.length * 2] = 0; // no skill overrides
    return `[&${toBase64(bytes)}]`;
  },
};
