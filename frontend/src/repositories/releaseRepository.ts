import { GITHUB_RELEASES_API_URL } from "../config/constants";

/** Subset of GET /repos/{owner}/{repo}/releases (newest first). */
export interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  assets: { name: string; browser_download_url: string }[];
}

export const releaseRepository = {
  /** Public GitHub API (no token; 60 requests / hour per visitor). Empty on any failure. */
  async list(): Promise<GithubRelease[]> {
    try {
      const res = await fetch(GITHUB_RELEASES_API_URL, { headers: { Accept: "application/vnd.github+json" } });
      if (!res.ok) return [];
      const body: unknown = await res.json();
      return Array.isArray(body) ? (body as GithubRelease[]) : [];
    } catch {
      return [];
    }
  },
};
