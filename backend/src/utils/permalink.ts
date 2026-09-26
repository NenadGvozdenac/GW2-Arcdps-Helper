/** Extracts the permalink from e.g. https://dps.report/ZM9s-20230109-190505_adina */
export function parsePermalink(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    return null;
  }
  if (!/(^|\.)dps\.report$/i.test(url.hostname)) return null;
  const slug = url.pathname.split("/").filter(Boolean)[0];
  if (!slug || !/^[A-Za-z0-9_-]+$/.test(slug) || slug.startsWith("get")) return null;
  return slug;
}
