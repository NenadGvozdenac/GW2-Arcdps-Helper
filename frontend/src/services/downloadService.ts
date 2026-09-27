import { releaseRepository, type GithubRelease } from "../repositories/releaseRepository";
import type { Download, Downloads } from "../domain/types/release.types";

/** uploader-vX.Y.Z */
const UPLOADER_TAG = /^uploader-v(\d.*)$/;
/** vX.Y.Z (what Nexus' GitHub updater understands); the first releases were tagged addon-vX.Y.Z. */
const ADDON_TAG = /^(?:addon-)?v(\d.*)$/;

/**
 * The uploader and the addon are released separately (see .github/workflows), so GitHub's "latest release" can't
 * serve both: pick the newest release of each tag pattern instead (the API lists the newest first).
 */
function latest(releases: GithubRelease[], tag: RegExp, asset: RegExp): Download | null {
  for (const r of releases) {
    const version = tag.exec(r.tag_name)?.[1];
    if (r.draft || r.prerelease || !version) continue;
    const file = r.assets.find((a) => asset.test(a.name));
    if (file) return { url: file.browser_download_url, version, fileName: file.name };
  }
  return null;
}

export const downloadService = {
  async latest(): Promise<Downloads> {
    const releases = await releaseRepository.list();
    return {
      uploader: latest(releases, UPLOADER_TAG, /-Setup-.*\.exe$/i),
      addon: latest(releases, ADDON_TAG, /\.dll$/i),
    };
  },
};
