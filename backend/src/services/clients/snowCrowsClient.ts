import { SNOW_CROWS_BASE_URL, SNOW_CROWS_SEARCH_SECTION, SNOW_CROWS_TIMEOUT_MS } from "../../config/constants";

/** Snow Crows has no API: its pages are server-rendered HTML, parsed by misc/snowCrowsParser. */
async function getHtml(url: string): Promise<string | null> {
  const res = await fetch(url, {
    headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (compatible; GW2 ArcDPS Helper)" },
    signal: AbortSignal.timeout(SNOW_CROWS_TIMEOUT_MS),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Snow Crows returned ${res.status} for ${url}`);
  return res.text();
}

/** The build list filtered to one specialization (its first 20 builds — more than any specialization has). */
export const fetchBuildList = async (specialization: string): Promise<string> =>
  (await getHtml(
    `${SNOW_CROWS_BASE_URL}/builds/${SNOW_CROWS_SEARCH_SECTION}?s=${encodeURIComponent(specialization)}`,
  )) ?? "";

/** A build page (`url` already checked against SNOW_CROWS_BUILD_URL_RE); null if it doesn't exist. */
export const fetchBuildPage = (url: string): Promise<string | null> => getHtml(url);
