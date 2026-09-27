import { languageStorage } from "../storage/languageStorage";
import { detectLanguage, isLanguage } from "../i18n/translate";
import type { Language } from "../i18n/i18n.types";

export const languageService = {
  /** Saved choice first, otherwise the browser's preferred language. */
  initial(): Language {
    const stored = languageStorage.get();
    if (isLanguage(stored)) return stored;
    return detectLanguage(typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []);
  },

  save: (lang: Language) => languageStorage.set(lang),
};
