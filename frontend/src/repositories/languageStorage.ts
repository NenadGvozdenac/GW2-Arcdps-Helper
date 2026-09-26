import { LANGUAGE_STORAGE_KEY } from "../config/constants";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored".
export const languageStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(lang: string): void {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* ignore */
    }
  },
};
