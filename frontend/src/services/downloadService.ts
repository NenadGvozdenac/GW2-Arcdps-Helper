import { releaseRepository, type GithubRelease } from "../repositories/releaseRepository";
import type { Download, Downloads } from "../domain/types/release.types";

/**
 * The uploader and the addon are released separately (tags uploader-vX.Y.Z / addon-vX.Y.Z, see .github/workflows),
 * so GitHub's "latest release" can't serve both: pick the newest release of each tag prefix instead.
 */
function latest(releases: GithubRelease[], tagPrefix: string, asset: RegExp): Download | null {
  for (const r of releases) {
    if (r.draft || r.prerelease || !r.tag_name.startsWith(tagPrefix)) continue;
    const file = r.assets.find((a) => asset.test(a.name));
    if (file) return { url: file.browser_download_url, version: r.tag_name.slice(tagPrefix.length), fileName: file.name };
  }
  return null;
}

export const downloadService = {
  async latest(): Promise<Downloads> {
    const releases = await releaseRepository.list();
    return {
      uploader: latest(releases, "uploader-v", /-Setup-.*\.exe$/i),
      addon: latest(releases, "addon-v", /\.dll$/i),
    };
  },
};
