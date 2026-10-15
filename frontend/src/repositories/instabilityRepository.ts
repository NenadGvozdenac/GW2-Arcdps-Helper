import type { InstabilityData } from "../domain/types/instability.types";

/** Community-maintained daily fractals and instabilities (CC BY-NC 4.0), served by GitHub with CORS. */
const BASE = "https://raw.githubusercontent.com/Invisi/gw2-fotm-instabilities/master";

let cache: Promise<InstabilityData> | null = null;

async function getJson<T>(file: string): Promise<T> {
  const res = await fetch(`${BASE}/${file}`);
  if (!res.ok) throw new Error(`${file} returned ${res.status}`);
  return (await res.json()) as T;
}

async function load(): Promise<InstabilityData> {
  const [instabilities, dailies, recommended, fractals] = await Promise.all([
    getJson<Pick<InstabilityData, "instabilities" | "instability_details">>("instabilities.json"),
    getJson<Pick<InstabilityData, "dailies">>("dailies.json"),
    getJson<Pick<InstabilityData, "recommended">>("recommended.json"),
    getJson<Pick<InstabilityData, "fractal_details">>("fractals.json"),
  ]);
  return {
    ...instabilities,
    dailies: dailies.dailies,
    recommended: recommended.recommended,
    fractal_details: fractals.fractal_details,
  };
}

export const instabilityRepository = {
  /** The whole year's instabilities and the daily and recommended fractals, loaded once per page visit. */
  all(): Promise<InstabilityData> {
    if (!cache) {
      cache = load();
      // A failed load is retried next time instead of being cached.
      cache.catch(() => (cache = null));
    }
    return cache;
  },
};
