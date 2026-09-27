import { DOWNLOADS_CACHE_MS, DOWNLOADS_STORAGE_KEY } from "../config/constants";
import type { Downloads } from "../domain/types/release.types";

interface Stored {
  savedAt: number;
  downloads: Downloads;
}

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored".
export const downloadsStorage = {
  /** The last looked-up download links, while they are younger than DOWNLOADS_CACHE_MS. */
  get(): Downloads | null {
    try {
      const stored = JSON.parse(localStorage.getItem(DOWNLOADS_STORAGE_KEY) ?? "null") as Stored | null;
      if (!stored || Date.now() - stored.savedAt > DOWNLOADS_CACHE_MS) return null;
      return stored.downloads;
    } catch {
      return null;
    }
  },
  set(downloads: Downloads): void {
    try {
      localStorage.setItem(DOWNLOADS_STORAGE_KEY, JSON.stringify({ savedAt: Date.now(), downloads } satisfies Stored));
    } catch {
      /* ignore */
    }
  },
};
