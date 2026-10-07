import type {
  Gw2Legend,
  Gw2Pet,
  Gw2Profession,
  Gw2Skill,
  Gw2Specialization,
  Gw2Trait,
  ProfessionData,
} from "../domain/types/gw2.types";

/** The official GW2 API: public, CORS-enabled, no key needed for these endpoints. */
const API = "https://api.guildwars2.com/v2";
/** The professions endpoint's current schema (weapons with their skills, skills_by_palette, code). */
const PROFESSION_SCHEMA = "2019-12-19T00:00:00.000Z";
const IDS_PER_REQUEST = 200;

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  // 206: some ids unknown, the rest returned.
  if (!res.ok && res.status !== 206) throw new Error(`GW2 API returned ${res.status} for ${path}`);
  return (await res.json()) as T;
}

async function byIds<T>(path: string, ids: number[]): Promise<T[]> {
  const unique = [...new Set(ids)];
  const chunks: Promise<T[]>[] = [];
  for (let i = 0; i < unique.length; i += IDS_PER_REQUEST) {
    chunks.push(getJson<T[]>(`${path}?ids=${unique.slice(i, i + IDS_PER_REQUEST).join(",")}`));
  }
  return (await Promise.all(chunks)).flat();
}

const byId = <T extends { id: number }>(list: T[]) => Object.fromEntries(list.map((x) => [x.id, x])) as Record<number, T>;

async function loadProfession(name: string): Promise<ProfessionData> {
  const profession = await getJson<Gw2Profession>(`/professions/${name}?v=${PROFESSION_SCHEMA}`);
  const specializations = await byIds<Gw2Specialization>("/specializations", profession.specializations);
  const legends = name === "Revenant" ? await getJson<Gw2Legend[]>("/legends?ids=all") : [];
  const pets = name === "Ranger" ? await getJson<Gw2Pet[]>("/pets?ids=all") : [];
  const traitIds = specializations.flatMap((s) => [...s.minor_traits, ...s.major_traits]);
  const skillIds = [
    ...profession.skills.map((s) => s.id),
    ...Object.values(profession.weapons).flatMap((w) => w.skills.map((s) => s.id)),
    ...legends.flatMap((l) => [l.swap, l.heal, l.elite, ...l.utilities]),
  ];
  const [traits, skills] = await Promise.all([
    byIds<Gw2Trait>("/traits", traitIds),
    byIds<Gw2Skill>("/skills", skillIds),
  ]);
  return { profession, specializations, traits: byId(traits), skills: byId(skills), legends, pets };
}

const cache = new Map<string, Promise<ProfessionData>>();

export const gw2ApiRepository = {
  /** A profession's specializations, traits, skills (and legends / pets), loaded once per page visit. */
  profession(name: string): Promise<ProfessionData> {
    let data = cache.get(name);
    if (!data) {
      data = loadProfession(name);
      // A failed load is retried next time instead of being cached.
      data.catch(() => cache.delete(name));
      cache.set(name, data);
    }
    return data;
  },
};
