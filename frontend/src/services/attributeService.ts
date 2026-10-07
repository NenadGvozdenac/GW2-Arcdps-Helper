import catalogJson from "../domain/data/gw2Catalog.json";
import { PROFESSION_INFO, WEAPON_ITEM_TYPE } from "../domain/data/professions";
import {
  ARMOR_SLOTS,
  TRINKET_SLOTS,
  type BuildAttributes,
  type CustomBuildData,
  type TrinketSlot,
} from "../domain/types/customBuild.types";
import type { Gw2Attribute, Gw2Catalog, StatAttribute } from "../domain/types/gw2.types";

export const catalog = catalogJson as unknown as Gw2Catalog;

type Totals = Record<Gw2Attribute, number>;

/** How the bonus lines of runes, food and utility items name attributes. */
const ATTRIBUTE_NAMES: Record<string, Gw2Attribute> = {
  power: "Power",
  precision: "Precision",
  toughness: "Toughness",
  vitality: "Vitality",
  ferocity: "CritDamage",
  "condition damage": "ConditionDamage",
  expertise: "ConditionDuration",
  concentration: "BoonDuration",
  "healing power": "Healing",
  healing: "Healing",
  "agony resistance": "AgonyResistance",
};
/** "+N to All Stats" (runes such as Divinity). */
const ALL_STATS: Gw2Attribute[] = [
  "Power",
  "Precision",
  "Toughness",
  "Vitality",
  "CritDamage",
  "ConditionDamage",
  "ConditionDuration",
  "BoonDuration",
  "Healing",
];

const TRINKET_TYPE: Record<TrinketSlot, string> = {
  Back: "Back",
  Accessory1: "Accessory",
  Accessory2: "Accessory",
  Amulet: "Amulet",
  Ring1: "Ring",
  Ring2: "Ring",
};

const zero = (): Totals => ({
  Power: 0,
  Precision: 0,
  Toughness: 0,
  Vitality: 0,
  CritDamage: 0,
  ConditionDamage: 0,
  ConditionDuration: 0,
  BoonDuration: 0,
  Healing: 0,
  AgonyResistance: 0,
});

/** A slot's attributes: the stat combination scaled by the slot (rounded per attribute, as the game does). */
function addStat(totals: Totals, attributes: StatAttribute[] | undefined, adjustment: number) {
  for (const a of attributes ?? []) totals[a.attribute] += Math.round(adjustment * a.multiplier + a.value);
}

/**
 * Applies bonus lines ("+25 Power", "+10% Boon Duration", "+12 to All Stats") to the totals; percent durations go to
 * `durations`. Conversions ("Gain Power Equal to 3% of Your Precision") are returned to apply after everything else.
 */
function addBonuses(totals: Totals, durations: { boon: number; condition: number }, lines: string[]) {
  const conversions: { to: Gw2Attribute; from: Gw2Attribute; percent: number }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    const flat = line.match(/^\+(\d+)\s+(?:to\s+)?(.+)$/i);
    if (flat) {
      const name = flat[2].toLowerCase();
      if (name === "all stats" || name === "all attributes") ALL_STATS.forEach((a) => (totals[a] += Number(flat[1])));
      else if (ATTRIBUTE_NAMES[name]) totals[ATTRIBUTE_NAMES[name]] += Number(flat[1]);
      continue;
    }
    const pct = line.match(/^\+(\d+(?:\.\d+)?)%\s+(Boon|Condition) Duration$/i);
    if (pct) {
      durations[pct[2].toLowerCase() === "boon" ? "boon" : "condition"] += Number(pct[1]);
      continue;
    }
    const conv = line.match(/^Gain (.+?) Equal to (\d+(?:\.\d+)?)% of Your (.+)$/i);
    if (conv && ATTRIBUTE_NAMES[conv[1].toLowerCase()] && ATTRIBUTE_NAMES[conv[3].toLowerCase()]) {
      conversions.push({
        to: ATTRIBUTE_NAMES[conv[1].toLowerCase()],
        from: ATTRIBUTE_NAMES[conv[3].toLowerCase()],
        percent: Number(conv[2]),
      });
    }
  }
  return conversions;
}

export const attributeService = {
  /** The item API's weapon type for a weapon the profession API names (land spear → "Harpoon"). */
  weaponItemType: (type: string) => WEAPON_ITEM_TYPE[type] ?? type,

  /**
   * The build's attributes out of combat, from its gear: level-80 base, armor, the weapons of `weaponSet` (0 / 1),
   * trinkets, runes (by how many pieces carry each), infusions, food and utility (conversions last, on the totals).
   * Traits and boons aren't counted.
   */
  compute(data: CustomBuildData, weaponSet = 0): BuildAttributes {
    const totals = zero();
    const durations = { boon: 0, condition: 0 };
    totals.Power = totals.Precision = totals.Toughness = totals.Vitality = 1000;
    const info = PROFESSION_INFO[data.profession];
    const armorSlots = catalog.slots.armor[info.weight] ?? {};
    let defense = 0;

    for (const slot of ARMOR_SLOTS) {
      const piece = data.armor[slot];
      const scale = armorSlots[slot];
      if (!scale) continue;
      defense += scale.defense;
      addStat(totals, catalog.stats[piece.stat]?.gear, scale.adjustment);
    }

    const set = data.weapons[weaponSet];
    for (const weapon of [set?.main, set?.off]) {
      if (!weapon) continue;
      const scale = catalog.slots.weapons[attributeService.weaponItemType(weapon.type)];
      if (scale) addStat(totals, catalog.stats[weapon.stat]?.gear, scale.adjustment);
    }

    for (const slot of TRINKET_SLOTS) {
      const scale = catalog.slots.trinkets[TRINKET_TYPE[slot]];
      if (scale) addStat(totals, catalog.stats[data.trinkets[slot].stat]?.trinket, scale.adjustment);
    }

    // Runes: each set bonus up to the number of pieces carrying that rune.
    const runeCounts = new Map<number, number>();
    for (const slot of ARMOR_SLOTS) {
      const rune = data.armor[slot].rune;
      if (rune) runeCounts.set(rune, (runeCounts.get(rune) ?? 0) + 1);
    }
    const conversions = [];
    for (const [id, count] of runeCounts) {
      const rune = catalog.runes.find((r) => r.id === id);
      if (rune) conversions.push(...addBonuses(totals, durations, rune.bonuses.slice(0, count)));
    }

    for (const { id, count } of data.infusions) {
      const infusion = catalog.infusions.find((i) => i.id === id);
      for (const a of infusion?.attributes ?? []) totals[a.attribute] += a.value * count;
    }

    const food = catalog.food.find((f) => f.id === data.food);
    if (food) conversions.push(...addBonuses(totals, durations, food.bonuses));
    const utility = catalog.utility.find((u) => u.id === data.utility);
    if (utility) conversions.push(...addBonuses(totals, durations, utility.bonuses));

    // Conversions read the totals before any of them apply.
    const before = { ...totals };
    for (const c of conversions) totals[c.to] += Math.round((before[c.from] * c.percent) / 100);

    return {
      power: totals.Power,
      precision: totals.Precision,
      toughness: totals.Toughness,
      vitality: totals.Vitality,
      ferocity: totals.CritDamage,
      conditionDamage: totals.ConditionDamage,
      expertise: totals.ConditionDuration,
      concentration: totals.BoonDuration,
      healingPower: totals.Healing,
      agonyResistance: totals.AgonyResistance,
      armor: totals.Toughness + defense,
      health: info.baseHealth + totals.Vitality * 10,
      critChance: 5 + (totals.Precision - 1000) / 21,
      critDamage: 150 + totals.CritDamage / 15,
      conditionDuration: totals.ConditionDuration / 15 + durations.condition,
      boonDuration: totals.BoonDuration / 15 + durations.boon,
    };
  },
};
