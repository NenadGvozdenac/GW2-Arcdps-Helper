// Reads builds out of Snow Crows' server-rendered HTML (they have no API). Gear items are left as GW2 item ids; the
// page only has their ids (its tooltips are loaded by a script from the GW2 API).
import type { BuildBenchmark, BuildGear, GearPiece } from "../../types/build.types";

/** One row of a Snow Crows build list. */
export interface BuildListCard {
  /** Path on snowcrows.com, e.g. "/builds/raids/mesmer/power-virtuoso-spear-dagger-sword". */
  path: string;
  name: string;
  weapons: string;
  /** "Power DPS", "Quickness Giver", "Healer"… */
  roles: string[];
}

/** A build page, gear with GW2 item ids. */
export interface BuildPage {
  name: string;
  weapons: string;
  template: string | null;
  updated: string | null;
  benchmark: BuildBenchmark | null;
  gear: BuildGear<number>;
}

const ARMOR_SLOTS = new Set(["Helm", "Shoulders", "Coat", "Gloves", "Leggings", "Boots"]);
const TRINKET_SLOTS = new Set(["Backpiece", "Accessory", "Amulet", "Ring"]);
const WEAPON_SLOTS = new Set(["Main Hand", "Off Hand", "Two Hand", "Two-Handed"]);

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, e: string) => {
    if (e[0] !== "#") return ENTITIES[e.toLowerCase()] ?? match;
    return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  });
}

/** The visible text of an HTML fragment, whitespace collapsed. */
function text(html: string): string {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

const CARD_RE = /<a href="(\/builds\/[a-z-]+\/[a-z]+\/[a-z0-9-]+)" class="p-4[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
/** The icon of a role chip: `<i class="fa-solid fa-sword mr-1.5" data-tippy-content="Power DPS"></i> Power`. */
const ROLE_RE = /<i class="[^"]*\bmr-1\.5" data-tippy-content="([^"]+)"/g;

/** The builds of a list page, in the page's order. */
export function parseBuildList(html: string): BuildListCard[] {
  const cards = new Map<string, BuildListCard>();
  for (const [, path, body] of html.matchAll(CARD_RE)) {
    const name = text(body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/)?.[1] ?? "");
    if (!name || cards.has(path)) continue;
    cards.set(path, {
      path,
      name,
      weapons: text(body.match(/<div class="text-sm text-neutral-400 pt-1[^"]*">([\s\S]*?)<\/div>/)?.[1] ?? ""),
      roles: [...body.matchAll(ROLE_RE)].map((m) => decodeEntities(m[1])),
    });
  }
  return [...cards.values()];
}

interface GearRow {
  section: string;
  label: string;
  slot: string;
  /** The row's own item (the armor piece, the relic…): its first, full-size embed. */
  itemId: number | null;
  /** Its upgrades: the small embeds. */
  ids: number[];
}

/**
 * The rows of the "Gear" tables: each `<tr>` has the item as a full-size embed, a
 * `<p class="mb-1">Label<span>Slot</span></p>` and its upgrades (rune, sigils; for infusions / food / utility the item
 * itself again) as small `data-armory-size="20"` embeds. Weapon sets and "Other Items" are headed by `<th colspan="2">`.
 */
function parseGearRows(html: string): GearRow[] {
  const start = html.indexOf('id="gearset"');
  if (start < 0) return [];
  const rest = html.slice(start);
  const end = rest.search(/<\/table>\s*<\/div>/);
  const region = end < 0 ? rest : rest.slice(0, end);

  const rows: GearRow[] = [];
  let section = "";
  const tokens =
    /<th colspan="2">([^<]*)<\/th>|<tr>|<p class="mb-1">([\s\S]*?)<\/p>|data-armory-ids="(\d+)"( data-armory-size="20")?/g;
  for (const [token, header, label, id, small] of region.matchAll(tokens)) {
    const row = rows.at(-1);
    if (header !== undefined) section = text(header);
    else if (token === "<tr>") rows.push({ section, label: "", slot: "", itemId: null, ids: [] });
    else if (label !== undefined && row) {
      const [before, slot = ""] = label.split(/<span[^>]*>/);
      row.label = text(before);
      row.slot = text(slot);
    } else if (id && row) {
      if (small) row.ids.push(Number(id));
      else row.itemId ??= Number(id);
    }
  }
  return rows.filter((r) => r.label);
}

function parseGear(html: string): BuildGear<number> {
  const gear: BuildGear<number> = {
    armor: [],
    trinkets: [],
    relic: null,
    weapons: [],
    infusions: [],
    food: null,
    utility: null,
    jadeBotCore: null,
  };
  for (const row of parseGearRows(html)) {
    const piece: GearPiece<number> = { slot: row.slot, stat: row.label, upgrades: row.ids };
    const item = row.ids[0] ?? null;
    if (ARMOR_SLOTS.has(row.slot)) gear.armor.push(piece);
    else if (TRINKET_SLOTS.has(row.slot)) gear.trinkets.push({ ...piece, upgrades: [] });
    else if (row.slot === "Relic") gear.relic = row.itemId;
    else if (WEAPON_SLOTS.has(row.slot)) {
      const set = row.section.replace(/\s*Weapon Set$/i, "");
      gear.weapons.push({ set, slot: row.slot, name: row.label, sigils: row.ids });
    } else if (row.label === "Infusion" && item) {
      gear.infusions.push({ item, count: Number(row.slot.replace(/\D/g, "")) || 1 });
    } else if (row.label === "Food") gear.food = item;
    else if (row.label === "Utility") gear.utility = item;
    else if (row.label === "Jade Bot Core") gear.jadeBotCore = item;
  }
  return gear;
}

/**
 * A stat box of the benchmark: `<div … stat="Last Benchmark Max"> … <div class="text-lg"><i …></i>39346</div>`; null
 * when the build has no benchmark.
 */
function benchmarkStat(html: string, stat: string): number | null {
  const box = new RegExp(`stat="${stat}"[\\s\\S]*?<div class="text-lg">[\\s\\S]*?</i>\\s*([\\d,.]+)\\s*</div>`);
  const value = html.match(box)?.[1];
  const n = value ? Number(value.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseBenchmark(html: string): BuildBenchmark | null {
  const max = benchmarkStat(html, "Last Benchmark Max");
  const average = benchmarkStat(html, "Last Benchmark Average");
  return max === null ? null : { max, average: average ?? max };
}

/** A build page; null when the HTML is not one (no build title). */
export function parseBuildPage(html: string): BuildPage | null {
  const name = text(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? "");
  if (!name) return null;
  const template = html.match(/writeText\('(\[&(?:amp;)?[A-Za-z0-9+/=]+\])'\)/)?.[1];
  return {
    name,
    weapons: text(html.match(/<\/h1>[\s\S]*?<div class="text-xl mt-2 mb-1">([\s\S]*?)<\/div>/)?.[1] ?? ""),
    template: template ? decodeEntities(template) : null,
    updated: html.match(/Updated\s*<span[^>]*>([^<]+)<\/span>/)?.[1]?.trim() ?? null,
    benchmark: parseBenchmark(html),
    gear: parseGear(html),
  };
}
