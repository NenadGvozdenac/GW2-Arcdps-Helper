import { FAVORITE_BUILDS_MAX, PARALLEL_FETCHES, SNOW_CROWS_BASE_URL } from "../config/constants";
import { SPECIALIZATION_ALIASES, SPECIALIZATIONS } from "../data/specializations";
import { favoriteBuildRepository } from "../repositories/favoriteBuildRepository";
import type {
  BuildCategory,
  BuildDetails,
  BuildGear,
  BuildSearchResult,
  FavoriteBuild,
  GearItem,
} from "../types/build.types";
import { buildNotFound, buildSpecUnknown, favoriteBuildsLimit, snowCrowsUnavailable } from "../utils/httpError";
import { fetchItems } from "./clients/gw2ApiClient";
import { fetchBuildList, fetchBuildPage } from "./clients/snowCrowsClient";
import { parseBuildList, parseBuildPage, type BuildPage } from "./misc/snowCrowsParser";

const SPEC_NAMES = Object.keys(SPECIALIZATIONS);
/** Shorthands players type that don't appear in build names. */
const QUERY_ALIASES: Record<string, string> = { qdps: "quickness", adps: "alac" };

/** Finds the specialization named in the query: its full name, a common short name or a 4+ letter prefix. */
function findSpecialization(tokens: string[]): { spec: string; rest: string[] } | null {
  for (const [i, token] of tokens.entries()) {
    const spec =
      SPEC_NAMES.find((s) => s.toLowerCase() === token) ??
      SPECIALIZATION_ALIASES[token] ??
      (token.length >= 4 ? SPEC_NAMES.find((s) => s.toLowerCase().startsWith(token)) : undefined);
    if (spec) return { spec, rest: tokens.filter((_, j) => j !== i) };
  }
  return null;
}

/** The build's specialization: the last word of its name that is one ("Heal Quickness Troubadour" → Troubadour). */
const specializationOf = (name: string): string =>
  name
    .split(/\s+/)
    .reverse()
    .find((w) => w in SPECIALIZATIONS) ?? "";

/** "/builds/raids/mesmer/…" → "Mesmer". */
function professionOf(url: string): string {
  const slug = new URL(url).pathname.split("/")[3] ?? "";
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

/** Our categories from the Snow Crows roles and the build name ("heal" / "quickness" / "alacrity" / "boon" in it). */
function suggestCategories(roles: string[], name: string): BuildCategory[] {
  const n = name.toLowerCase();
  const healer = roles.includes("Healer") || /\bheal\b/.test(n);
  const quickness = roles.includes("Quickness Giver") || n.includes("quickness");
  const alac = roles.includes("Alacrity Giver") || n.includes("alacrity");
  const categories: BuildCategory[] = [healer ? "healer" : quickness || alac || /\bboon\b/.test(n) ? "bdps" : "dps"];
  if (alac) categories.push("alac");
  if (quickness) categories.push("quickness");
  return categories;
}

async function fromSnowCrows<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (err) {
    console.error("Snow Crows request failed", err);
    throw snowCrowsUnavailable();
  }
}

/** The parsed build page; null when Snow Crows has no such build (any more). */
async function fetchPage(url: string): Promise<BuildPage | null> {
  const html = await fromSnowCrows(() => fetchBuildPage(url));
  return html ? parseBuildPage(html) : null;
}

/**
 * Resolves the gear's item ids of several build pages with one GW2 API request. If the API is down, items keep a
 * placeholder name rather than failing the whole build.
 */
async function toDetails(pages: { url: string; page: BuildPage }[]): Promise<BuildDetails[]> {
  const ids = pages.flatMap(({ page: { gear: g } }) => [
    ...g.armor.flatMap((p) => p.upgrades),
    ...g.weapons.flatMap((w) => w.sigils),
    ...g.infusions.map((i) => i.item),
    ...[g.relic, g.food, g.utility, g.jadeBotCore].filter((id): id is number => id !== null),
  ]);
  let items = new Map<number, GearItem>();
  try {
    if (ids.length) items = await fetchItems(ids);
  } catch (err) {
    console.error("GW2 API item lookup failed", err);
  }
  const item = (id: number): GearItem => items.get(id) ?? { id, name: `Item ${id}`, icon: null };
  const optional = (id: number | null) => (id === null ? null : item(id));

  return pages.map(({ url, page }) => {
    const g = page.gear;
    const gear: BuildGear = {
      armor: g.armor.map((p) => ({ ...p, upgrades: p.upgrades.map(item) })),
      trinkets: g.trinkets.map((p) => ({ ...p, upgrades: [] })),
      relic: optional(g.relic),
      weapons: g.weapons.map((w) => ({ ...w, sigils: w.sigils.map(item) })),
      infusions: g.infusions.map((i) => ({ item: item(i.item), count: i.count })),
      food: optional(g.food),
      utility: optional(g.utility),
      jadeBotCore: optional(g.jadeBotCore),
    };
    return {
      url,
      name: page.name,
      weapons: page.weapons,
      profession: professionOf(url),
      specialization: specializationOf(page.name),
      template: page.template,
      updated: page.updated,
      gear,
    };
  });
}

async function getDetails(url: string): Promise<BuildDetails> {
  const page = await fetchPage(url);
  if (!page) throw buildNotFound();
  const [details] = await toDetails([{ url, page }]);
  return details;
}

/**
 * The Snow Crows roles of every build of these specializations, by build url. They are only on the build lists, not the
 * build pages: one list per specialization. A list that can't be fetched is left out (logged).
 */
async function snowCrowsRoles(specializations: string[]): Promise<Map<string, string[]>> {
  const roles = new Map<string, string[]>();
  const specs = [...new Set(specializations)].filter(Boolean);
  for (let i = 0; i < specs.length; i += PARALLEL_FETCHES) {
    await Promise.all(
      specs.slice(i, i + PARALLEL_FETCHES).map(async (spec) => {
        try {
          for (const card of parseBuildList(await fetchBuildList(spec))) {
            roles.set(`${SNOW_CROWS_BASE_URL}${card.path}`, card.roles);
          }
        } catch (err) {
          console.error(`Snow Crows build list of ${spec} failed`, err);
        }
      }),
    );
  }
  return roles;
}

/**
 * What makes a build "changed": everything Snow Crows shows, items by id (their names / icons come from the GW2 API).
 * Object keys are sorted, since jsonb doesn't keep the order the gear was saved in.
 */
const fingerprint = (b: BuildDetails): string =>
  JSON.stringify([b.name, b.weapons, b.template, b.updated, b.gear], (_key, value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    if ("id" in value && "icon" in value) return (value as GearItem).id;
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
  });

export const buildService = {
  /**
   * Snow Crows builds of the specialization named in `query` ("power virtuoso", "heal fb", "chrono alac"…), the best
   * matches of its other words first (beginner builds after the others).
   */
  async search(query: string): Promise<BuildSearchResult[]> {
    const tokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const found = findSpecialization(tokens);
    if (!found) throw buildSpecUnknown();
    const cards = parseBuildList(await fromSnowCrows(() => fetchBuildList(found.spec)));
    const words = found.rest.map((t) => QUERY_ALIASES[t] ?? t);

    return cards
      .map((card, order) => {
        const url = `${SNOW_CROWS_BASE_URL}${card.path}`;
        const result: BuildSearchResult = {
          url,
          name: card.name,
          weapons: card.weapons,
          profession: professionOf(url),
          specialization: specializationOf(card.name) || found.spec,
          roles: card.roles,
          categories: suggestCategories(card.roles, card.name),
        };
        // A word in the name / weapons counts more than one only matching a suggested category ("heal" → healer).
        const text = `${card.name} ${card.weapons} ${card.path}`.toLowerCase();
        const categories = result.categories.join(" ");
        const score = words.reduce((s, w) => s + (text.includes(w) ? 2 : categories.includes(w) ? 1 : 0), 0);
        const beginner = card.path.includes("/beginner-");
        return { result, score, beginner, order };
      })
      .sort((a, b) => b.score - a.score || Number(a.beginner) - Number(b.beginner) || a.order - b.order)
      .map((r) => r.result);
  },

  /** A build page with its template and gear (`url` checked by the validation schema). */
  details: (url: string): Promise<BuildDetails> => getDetails(url),

  listFavorites: (userId: string): Promise<FavoriteBuild[]> => favoriteBuildRepository.list(userId),

  /** Adds the build to the favorites (or updates it if it's there already), categories from its Snow Crows roles. */
  async addFavorite(userId: string, url: string): Promise<FavoriteBuild> {
    if (
      !(await favoriteBuildRepository.existsByUrl(userId, url)) &&
      (await favoriteBuildRepository.count(userId)) >= FAVORITE_BUILDS_MAX
    ) {
      throw favoriteBuildsLimit();
    }
    const build = await getDetails(url);
    const roles = await snowCrowsRoles([build.specialization]);
    return favoriteBuildRepository.upsert(userId, build, suggestCategories(roles.get(url) ?? [], build.name));
  },

  /** Drag & drop: the favorite takes the place of `overId`. */
  async moveFavorite(userId: string, id: string, overId: string): Promise<void> {
    if (!(await favoriteBuildRepository.move(userId, id, overId))) throw buildNotFound();
  },

  async removeFavorite(userId: string, id: string): Promise<void> {
    if (!(await favoriteBuildRepository.remove(userId, id))) throw buildNotFound();
  },

  /**
   * Fetches every favorite again from Snow Crows. Builds whose page changed are marked (changedAt); builds that could
   * not be fetched (removed from Snow Crows, or it is down) keep their snapshot and are listed in `failed`. Categories
   * follow the current Snow Crows roles (kept as they were if the build list can't be fetched).
   */
  async refreshFavorites(userId: string): Promise<{ builds: FavoriteBuild[]; changed: string[]; failed: string[] }> {
    const favorites = await favoriteBuildRepository.list(userId);
    const pages: { favorite: FavoriteBuild; page: BuildPage }[] = [];
    const failed: string[] = [];
    for (let i = 0; i < favorites.length; i += PARALLEL_FETCHES) {
      const chunk = favorites.slice(i, i + PARALLEL_FETCHES);
      const fetched = await Promise.all(chunk.map((f) => fetchPage(f.url).catch(() => null)));
      chunk.forEach((favorite, j) => {
        const page = fetched[j];
        if (page) pages.push({ favorite, page });
        else failed.push(favorite.id);
      });
    }

    const details = await toDetails(pages.map(({ favorite, page }) => ({ url: favorite.url, page })));
    const roles = await snowCrowsRoles(details.map((d) => d.specialization));
    const changed: string[] = [];
    await Promise.all(
      pages.map(({ favorite }, i) => {
        const isChanged = fingerprint(details[i]) !== fingerprint(favorite);
        if (isChanged) changed.push(favorite.id);
        const buildRoles = roles.get(favorite.url);
        const categories = buildRoles ? suggestCategories(buildRoles, details[i].name) : favorite.categories;
        return favoriteBuildRepository.refresh(userId, favorite.id, details[i], categories, isChanged);
      }),
    );
    return { builds: await favoriteBuildRepository.list(userId), changed, failed };
  },
};
