// Builds frontend/src/domain/data/gw2Catalog.json — what the website's build editor needs from the GW2 API that can't be
// looked up item by item: the ascended stat combinations per slot type, each slot's stat scaling and armor defense, and
// the lists of runes, sigils, relics, food, utility items and stat infusions to pick from.
// Usage (from backend/): `npx tsx src/scripts/buildGw2Catalog.ts`. Re-run after a game update adds items.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.guildwars2.com/v2";
const PAGE_SIZE = 200;
const PARALLEL = 8;

interface ApiItem {
  id: number;
  name: string;
  type: string;
  rarity: string;
  level: number;
  icon?: string;
  description?: string;
  details?: Record<string, unknown> & {
    type?: string;
    weight_class?: string;
    defense?: number;
    attribute_adjustment?: number;
    stat_choices?: number[];
    bonuses?: string[];
    description?: string;
    infix_upgrade?: { attributes?: { attribute: string; modifier: number }[]; buff?: { description?: string } };
  };
}
interface ApiItemStat {
  id: number;
  name: string;
  attributes: { attribute: string; multiplier: number; value: number }[];
}

async function getJson<T>(path: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${API}${path}`);
    if (res.ok) return (await res.json()) as T;
    if (attempt >= 5) throw new Error(`${res.status} for ${path}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
}

async function allItems(): Promise<ApiItem[]> {
  // CATALOG_CACHE=<file>: reuse the items fetched by an earlier run (saved there), to iterate on the filters quickly.
  const cache = process.env.CATALOG_CACHE;
  if (cache && existsSync(cache)) return JSON.parse(readFileSync(cache, "utf8")) as ApiItem[];
  const ids = await getJson<number[]>("/items");
  const pages = Math.ceil(ids.length / PAGE_SIZE);
  const items: ApiItem[] = [];
  for (let p = 0; p < pages; p += PARALLEL) {
    const batch = Array.from({ length: Math.min(PARALLEL, pages - p) }, (_, i) =>
      getJson<ApiItem[]>(`/items?page=${p + i}&page_size=${PAGE_SIZE}`),
    );
    for (const page of await Promise.all(batch)) items.push(...page);
    process.stdout.write(`\r${items.length} / ${ids.length} items`);
  }
  process.stdout.write("\n");
  if (cache) writeFileSync(cache, JSON.stringify(items));
  return items;
}

/** The level-80 nourishment lines of a food's GW2 wiki page; [] when it has none. */
async function wikiNourishment(name: string): Promise<string[]> {
  const url = `https://wiki.guildwars2.com/api.php?action=parse&format=json&prop=wikitext&page=${encodeURIComponent(name)}`;
  const res = await fetch(url, { headers: { "User-Agent": "GW2 ArcDPS Helper catalog script" } });
  if (!res.ok) return [];
  const text = ((await res.json()) as { parse?: { wikitext?: { "*": string } } }).parse?.wikitext?.["*"] ?? "";
  const effect = text.match(/variables\s*=\s*\{\{nourishment\|[^|]*\|([^}]*?)(?:\|level=|\|id=|\}\})/)?.[1] ?? "";
  return effect
    .split(/<br\s*\/?>/)
    .map((l) => l.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").trim())
    .filter(Boolean);
}

const TRINKET_SLOTS: Record<string, string> = { Amulet: "Amulet", Ring: "Ring", Accessory: "Accessory" };
const lines = (text: string | undefined) => (text ?? "").split(/\n|<br>/).map((l) => l.replace(/<[^>]*>/g, "").trim());

async function main() {
  const items = await allItems();
  const ascended = (i: ApiItem) => i.rarity === "Ascended" || i.rarity === "Legendary";

  // Slot scaling (attribute_adjustment) and armor defense, from selectable ascended / legendary gear; and which stat
  // combinations each kind of slot offers (armor and weapons share theirs, trinkets differ: they add flat values).
  const armor: Record<string, Record<string, { adjustment: number; defense: number }>> = {};
  const weapons: Record<string, { adjustment: number }> = {};
  const trinkets: Record<string, { adjustment: number }> = {};
  const choices = { gear: new Set<number>(), trinket: new Set<number>() };
  for (const i of items) {
    const d = i.details;
    if (!d || !ascended(i) || !d.stat_choices?.length || !d.attribute_adjustment) continue;
    if (i.type === "Armor" && d.weight_class && d.type && d.weight_class !== "Clothing") {
      (armor[d.weight_class] ??= {})[d.type] ??= { adjustment: d.attribute_adjustment, defense: d.defense ?? 0 };
      d.stat_choices.forEach((s) => choices.gear.add(s));
    } else if (i.type === "Weapon" && d.type) {
      weapons[d.type] ??= { adjustment: d.attribute_adjustment };
      d.stat_choices.forEach((s) => choices.gear.add(s));
    } else if (i.type === "Trinket" && d.type && TRINKET_SLOTS[d.type]) {
      trinkets[d.type] ??= { adjustment: d.attribute_adjustment };
      d.stat_choices.forEach((s) => choices.trinket.add(s));
    } else if (i.type === "Back") {
      trinkets.Back ??= { adjustment: d.attribute_adjustment };
      d.stat_choices.forEach((s) => choices.trinket.add(s));
    }
  }

  const statIds = [...new Set([...choices.gear, ...choices.trinket])];
  const stats: ApiItemStat[] = [];
  for (let i = 0; i < statIds.length; i += PAGE_SIZE) {
    stats.push(...(await getJson<ApiItemStat[]>(`/itemstats?ids=${statIds.slice(i, i + PAGE_SIZE).join(",")}`)));
  }
  // By name: the gear (armor / weapon) and trinket variant of each combination.
  const statsByName: Record<string, { gear?: ApiItemStat["attributes"]; trinket?: ApiItemStat["attributes"] }> = {};
  for (const s of stats) {
    if (!s.name) continue;
    const entry = (statsByName[s.name] ??= {});
    // Several variants share a name: armor / weapons use the one without flat values, trinkets the one with them.
    const flat = s.attributes.reduce((sum, a) => sum + a.value, 0);
    if (choices.gear.has(s.id) && (!entry.gear || flat === 0)) entry.gear = s.attributes;
    if (choices.trinket.has(s.id) && (!entry.trinket || flat > 0)) entry.trinket = s.attributes;
  }

  const pick = (i: ApiItem) => ({ id: i.id, name: i.name, icon: i.icon ?? null });
  const byName = <T extends { name: string }>(list: T[]) => list.sort((a, b) => a.name.localeCompare(b.name));
  const unique = <T extends { name: string }>(list: T[]) => [...new Map(list.map((x) => [x.name, x])).values()];

  // The exotic ones builds use (legendary runes / sigils share their names, with other ids and icons).
  const isUpgrade = (i: ApiItem, type: string) =>
    i.type === "UpgradeComponent" && i.details?.type === type && i.rarity === "Exotic" && i.name.startsWith("Superior ");
  const runes = unique(
    items
      .filter((i) => isUpgrade(i, "Rune"))
      .map((i) => ({ ...pick(i), bonuses: i.details?.bonuses ?? [] })),
  );
  const sigils = unique(
    items
      .filter((i) => isUpgrade(i, "Sigil"))
      .map((i) => ({ ...pick(i), description: i.details?.infix_upgrade?.buff?.description ?? "" })),
  );
  const relics = unique(
    items.filter((i) => i.type === "Relic" && i.rarity === "Exotic").map((i) => ({ ...pick(i), description: i.description ?? "" })),
  );
  // Single servings (feasts carry no bonuses in the API), level 80, with their bonus lines.
  const consumables = (type: string) =>
    unique(
      items
        .filter((i) => i.type === "Consumable" && i.details?.type === type && i.level >= 80 && i.details?.description)
        .map((i) => ({ ...pick(i), bonuses: lines(i.details?.description).filter(Boolean) })),
    );
  const infusions = unique(
    items
      .filter(
        (i) =>
          i.type === "UpgradeComponent" &&
          /^\w+ \+[5-9] Agony Infusion$/.test(i.name) &&
          (i.details?.infix_upgrade?.attributes ?? []).some((a) => a.attribute !== "AgonyResistance"),
      )
      .map((i) => ({
        ...pick(i),
        attributes: (i.details?.infix_upgrade?.attributes ?? []).map((a) => ({ attribute: a.attribute, value: a.modifier })),
      })),
  );

  // Ascended feasts carry no bonuses in the API: read them from the GW2 wiki ({{nourishment|1 h|line<br>line…}}).
  const feasts = unique(
    items.filter((i) => i.type === "Consumable" && i.details?.type === "Food" && i.level >= 80 && i.rarity === "Ascended"),
  ).filter((i) => !i.details?.description);
  const feastFood = [];
  for (const i of feasts) {
    const bonuses = await wikiNourishment(i.name);
    if (bonuses.length) feastFood.push({ ...pick(i), bonuses });
  }

  const catalog = {
    generatedAt: new Date().toISOString().slice(0, 10),
    stats: Object.fromEntries(
      Object.entries(statsByName)
        .filter(([, s]) => s.gear && s.trinket)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
    slots: { armor, weapons, trinkets },
    runes: byName(runes),
    sigils: byName(sigils),
    relics: byName(relics),
    food: byName(unique([...feastFood, ...consumables("Food")])),
    utility: byName(consumables("Utility")),
    infusions: byName(infusions),
  };
  const out = join(__dirname, "../../../frontend/src/domain/data/gw2Catalog.json");
  writeFileSync(out, JSON.stringify(catalog));
  console.log(
    `stats ${Object.keys(catalog.stats).length}, runes ${runes.length}, sigils ${sigils.length}, relics ${relics.length},`,
    `food ${catalog.food.length}, utility ${catalog.utility.length}, infusions ${infusions.length} → ${out}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
