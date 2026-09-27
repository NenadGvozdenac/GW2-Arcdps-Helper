import { LOGS_PAGE_SIZE_STORAGE_KEY } from "../config/constants";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored".
export const logsPageSizeStorage = {
  get(): number | null {
    try {
      const value = Number(localStorage.getItem(LOGS_PAGE_SIZE_STORAGE_KEY));
      return Number.isInteger(value) && value > 0 ? value : null;
    } catch {
      return null;
    }
  },
  set(size: number): void {
    try {
      localStorage.setItem(LOGS_PAGE_SIZE_STORAGE_KEY, String(size));
    } catch {
      /* ignore */
    }
  },
};
