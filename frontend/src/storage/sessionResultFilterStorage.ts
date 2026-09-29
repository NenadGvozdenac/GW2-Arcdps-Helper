import { SESSION_RESULT_FILTER_STORAGE_KEY } from "../config/constants";

/** "together": kills and wipes in one list. "split": kills first, wipes at the end. */
export type SessionResultFilter = "together" | "split";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored".
export const sessionResultFilterStorage = {
  get(): SessionResultFilter | null {
    try {
      const value = localStorage.getItem(SESSION_RESULT_FILTER_STORAGE_KEY);
      return value === "together" || value === "split" ? value : null;
    } catch {
      return null;
    }
  },
  set(filter: SessionResultFilter): void {
    try {
      localStorage.setItem(SESSION_RESULT_FILTER_STORAGE_KEY, filter);
    } catch {
      /* ignore */
    }
  },
};
