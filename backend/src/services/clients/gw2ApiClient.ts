import { GW2_API_BASE_URL, SNOW_CROWS_TIMEOUT_MS } from "../../config/constants";
import type { GearItem } from "../../types/build.types";

/** The API returns at most this many items per request. */
const IDS_PER_REQUEST = 200;

/** Names and icons of GW2 items (official API, English); ids the API doesn't know are missing from the map. */
export async function fetchItems(ids: number[]): Promise<Map<number, GearItem>> {
  const unique = [...new Set(ids)];
  const items = new Map<number, GearItem>();
  for (let i = 0; i < unique.length; i += IDS_PER_REQUEST) {
    const chunk = unique.slice(i, i + IDS_PER_REQUEST);
    const res = await fetch(`${GW2_API_BASE_URL}/v2/items?ids=${chunk.join(",")}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(SNOW_CROWS_TIMEOUT_MS),
    });
    // 206 = some ids unknown, the rest are returned.
    if (!res.ok && res.status !== 206) throw new Error(`GW2 API returned ${res.status}`);
    for (const item of (await res.json()) as { id: number; name: string; icon?: string }[]) {
      items.set(item.id, { id: item.id, name: item.name, icon: item.icon ?? null });
    }
  }
  return items;
}
