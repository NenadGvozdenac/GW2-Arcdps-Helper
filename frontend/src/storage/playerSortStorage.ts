import { PLAYER_SORT_STORAGE_KEY } from "../config/constants";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored".
export const playerSortStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(PLAYER_SORT_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(key: string): void {
    try {
      localStorage.setItem(PLAYER_SORT_STORAGE_KEY, key);
    } catch {
      /* ignore */
    }
  },
};
