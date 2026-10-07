import { AQUATIC_WEAPONS } from "../domain/data/professions";
import type { BuildCategory, BuildDetails, BuildGear, BuildKind, GearItem } from "../domain/types/build.types";
import {
  ARMOR_SLOTS,
  PROFESSIONS,
  TRINKET_SLOTS,
  type CustomBuildData,
  type CustomBuildDraft,
  type Profession,
  type TrinketSlot,
  type WeaponPick,
} from "../domain/types/customBuild.types";
import type { CatalogItem, ProfessionData } from "../domain/types/gw2.types";
import { buildRepository } from "../repositories/buildRepository";
import { gw2ApiRepository } from "../repositories/gw2ApiRepository";
import { catalog } from "./attributeService";
import { buildTemplateService } from "./buildTemplateService";

const DEFAULT_STAT = "Berserker's";

/** How the card names the trinket slots (as Snow Crows does). */
const TRINKET_LABEL: Record<TrinketSlot, string> = {
  Back: "Backpiece",
  Accessory1: "Accessory",
  Accessory2: "Accessory",
  Amulet: "Amulet",
  Ring1: "Ring",
  Ring2: "Ring",
};

const isProfession = (name: string): name is Profession => (PROFESSIONS as readonly string[]).includes(name);

/**
 * The catalog's id of a gear item: the same id, or (the API has several items of one name, e.g. a rune's variants, and
 * the catalog keeps one) the item of the same name. Null when the catalog doesn't have it.
 */
function catalogId(list: CatalogItem[], item: GearItem | null | undefined): number | null {
  if (!item) return null;
  return (list.find((i) => i.id === item.id) ?? list.find((i) => i.name === item.name))?.id ?? null;
}

/** A catalog item (rune, sigil, relic, food…) as a gear item of the card. */
function gearItem(list: CatalogItem[], id: number | null): GearItem | null {
  const item = id ? list.find((i) => i.id === id) : undefined;
  return item ? { id: item.id, name: item.name, icon: item.icon } : null;
}

/**
 * A build to start a draft from: a Snow Crows build (search result or favorite), a custom one or a shared one.
 */
export type BuildSource = Omit<BuildDetails, "url"> & {
  kind?: BuildKind;
  custom?: unknown;
  categories?: BuildCategory[];
};

/** A weapon of a profession: which hand(s) it goes in and the elite specialization that brought it (if any). */
export interface WeaponOption {
  type: string;
  mainHand: boolean;
  offHand: boolean;
  twoHanded: boolean;
  specialization: number | null;
}

export const customBuildService = {
  /** An empty build of the profession: no traits / skills / weapons, Berserker's armor and trinkets. */
  empty(profession: Profession): CustomBuildData {
    return {
      version: 1,
      profession,
      specializations: [0, 1, 2].map(() => ({ id: null, traits: [null, null, null] })),
      skills: { heal: null, utilities: [null, null, null], elite: null },
      legends: [null, null],
      pets: [null, null],
      weapons: [
        { main: null, off: null },
        { main: null, off: null },
      ],
      armor: Object.fromEntries(ARMOR_SLOTS.map((s) => [s, { stat: DEFAULT_STAT, rune: null }])) as CustomBuildData["armor"],
      trinkets: Object.fromEntries(TRINKET_SLOTS.map((s) => [s, { stat: DEFAULT_STAT }])) as CustomBuildData["trinkets"],
      relic: null,
      food: null,
      utility: null,
      infusions: [],
    };
  },

  professionData: (profession: string) => gw2ApiRepository.profession(profession),

  /** The weapons the profession can wield on land, with their hands and specialization. */
  weaponOptions(pd: ProfessionData): WeaponOption[] {
    return Object.entries(pd.profession.weapons)
      .filter(([type, w]) => !AQUATIC_WEAPONS.has(type) && !(w.flags.includes("Aquatic") && type !== "Spear"))
      .map(([type, w]) => ({
        type,
        mainHand: w.flags.includes("Mainhand") || w.flags.includes("TwoHand"),
        offHand: w.flags.includes("Offhand"),
        twoHanded: w.flags.includes("TwoHand"),
        specialization: w.specialization ?? null,
      }))
      .sort((a, b) => a.type.localeCompare(b.type));
  },

  isTwoHanded: (pd: ProfessionData, type: string) => !!pd.profession.weapons[type]?.flags.includes("TwoHand"),

  /** A GW2 API description without its markup ("<c=@reminder>…</c>"). */
  plainText: (text: string | undefined) => (text ?? "").replace(/<[^>]*>/g, "").trim(),

  /**
   * Whether a skill needing elite specialization `specialization` (if any) fits the build's third line. (Weapons always
   * do: with weapon mastery, every specialization wields the elite ones' weapons.)
   */
  fitsElite: (data: CustomBuildData, specialization: number | null | undefined) =>
    !specialization || data.specializations[2]?.id === specialization,

  /**
   * The weapon skills (1–5) of a weapon set: the main hand's 1–3 (1–5 when two-handed), the off hand's 4–5. Where a
   * slot has variants (elementalist attunements, thief dual skills), the fire / matching one.
   */
  weaponSkills(pd: ProfessionData, set: CustomBuildData["weapons"][number]): (number | null)[] {
    const pickSkill = (type: string | undefined, slot: string) => {
      const skills = type ? (pd.profession.weapons[type]?.skills ?? []) : [];
      const candidates = skills.filter((s) => s.slot === slot);
      return (
        candidates.find(
          (s) =>
            (!s.attunement || s.attunement === "Fire") &&
            (!s.offhand || s.offhand === set.off?.type || (s.offhand === "Nothing" && !set.off)),
        ) ?? candidates[0]
      )?.id ?? null;
    };
    const main = set.main?.type;
    const twoHanded = !!main && customBuildService.isTwoHanded(pd, main);
    return [1, 2, 3, 4, 5].map((n) =>
      n <= 3 || twoHanded ? pickSkill(main, `Weapon_${n}`) : pickSkill(set.off?.type, `Weapon_${n}`),
    );
  },

  /**
   * A draft that starts from a saved build: a custom one as it was, a Snow Crows one from its template code (traits,
   * skills) and gear. Null when the build's profession is unknown.
   */
  async fromBuild(build: BuildSource, name: string, categories: BuildCategory[] = []): Promise<CustomBuildDraft | null> {
    if (build.kind === "custom" && build.custom) {
      return { name, categories: build.categories ?? categories, data: build.custom as CustomBuildData };
    }
    if (!isProfession(build.profession)) return null;
    const pd = await gw2ApiRepository.profession(build.profession);
    const data = customBuildService.empty(build.profession);
    const parsed = build.template ? buildTemplateService.parse(build.template) : null;
    if (parsed && parsed.profession === build.profession) Object.assign(data, buildTemplateService.apply(parsed, pd));

    const { gear } = build;
    gear.armor.forEach((piece) => {
      const slot = ARMOR_SLOTS.find((s) => s === piece.slot);
      if (slot) data.armor[slot] = { stat: piece.stat, rune: catalogId(catalog.runes, piece.upgrades[0]) };
    });
    const trinketSlots: Record<string, TrinketSlot[]> = {
      Backpiece: ["Back"],
      Accessory: ["Accessory1", "Accessory2"],
      Amulet: ["Amulet"],
      Ring: ["Ring1", "Ring2"],
    };
    const used = new Set<TrinketSlot>();
    gear.trinkets.forEach((piece) => {
      const slot = trinketSlots[piece.slot]?.find((s) => !used.has(s));
      if (slot) {
        used.add(slot);
        data.trinkets[slot] = { stat: piece.stat };
      }
    });
    // "Berserker's Spear" → stat "Berserker's", type "Spear" (the longest weapon type the name ends with).
    const types = Object.keys(pd.profession.weapons).sort((a, b) => b.length - a.length);
    gear.weapons.forEach((w) => {
      const type = types.find((t) => w.name.toLowerCase().endsWith(t.toLowerCase()));
      if (!type) return;
      const pick: WeaponPick = {
        type,
        stat: w.name.slice(0, w.name.length - type.length).trim() || DEFAULT_STAT,
        sigils: w.sigils.map((s) => catalogId(catalog.sigils, s)),
      };
      const set = data.weapons[w.set.toLowerCase().startsWith("second") ? 1 : 0];
      if (w.slot.toLowerCase().startsWith("off")) set.off = pick;
      else set.main = pick;
    });
    data.relic = catalogId(catalog.relics, gear.relic);
    data.food = catalogId(catalog.food, gear.food);
    data.utility = catalogId(catalog.utility, gear.utility);
    data.infusions = gear.infusions.flatMap((i) => {
      const id = catalogId(catalog.infusions, i.item);
      return id ? [{ id, count: i.count }] : [];
    });
    return { name, categories: build.categories ?? categories, data };
  },

  /** The build's gear as the cards show it (like a Snow Crows build's). */
  toGear(data: CustomBuildData): BuildGear {
    const weapon = (w: WeaponPick, set: string, slot: string) => ({
      set,
      slot,
      name: `${w.stat} ${w.type}`,
      sigils: w.sigils.flatMap((id) => gearItem(catalog.sigils, id) ?? []),
    });
    return {
      armor: ARMOR_SLOTS.map((slot) => ({
        slot,
        stat: data.armor[slot].stat,
        upgrades: [gearItem(catalog.runes, data.armor[slot].rune)].flatMap((r) => r ?? []),
      })),
      trinkets: TRINKET_SLOTS.map((slot) => ({ slot: TRINKET_LABEL[slot], stat: data.trinkets[slot].stat, upgrades: [] })),
      relic: gearItem(catalog.relics, data.relic),
      weapons: data.weapons.flatMap((s, i) => {
        const set = i === 0 ? "Primary" : "Secondary";
        return [s.main && weapon(s.main, set, "Main Hand"), s.off && weapon(s.off, set, "Off Hand")].filter(
          (w): w is NonNullable<typeof w> => !!w,
        );
      }),
      infusions: data.infusions.flatMap((i) => {
        const item = gearItem(catalog.infusions, i.id);
        return item && i.count > 0 ? [{ item, count: i.count }] : [];
      }),
      food: gearItem(catalog.food, data.food),
      utility: gearItem(catalog.utility, data.utility),
      jadeBotCore: null,
    };
  },

  /** "Spear / Dagger & Sword": each set's weapons. */
  weaponsLabel(data: CustomBuildData): string {
    return data.weapons
      .map((s) => [s.main?.type, s.off?.type].filter(Boolean).join(" & "))
      .filter(Boolean)
      .join(" / ");
  },

  /** The build's elite specialization (third line) if it has one, otherwise the profession. */
  specializationName(data: CustomBuildData, pd: ProfessionData): string {
    const third = pd.specializations.find((s) => s.id === data.specializations[2]?.id);
    return third?.elite ? third.name : data.profession;
  },

  /** Saves the draft: a new custom build, or the changes to `id`. */
  save(draft: CustomBuildDraft, pd: ProfessionData, id?: string) {
    const input = {
      name: draft.name.trim(),
      profession: draft.data.profession,
      specialization: customBuildService.specializationName(draft.data, pd),
      weapons: customBuildService.weaponsLabel(draft.data),
      template: buildTemplateService.encode(draft.data, pd),
      gear: customBuildService.toGear(draft.data),
      categories: draft.categories,
      custom: draft.data,
    };
    return id ? buildRepository.updateCustom(id, input) : buildRepository.createCustom(input);
  },
};
