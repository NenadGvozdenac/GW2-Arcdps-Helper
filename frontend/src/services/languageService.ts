import { languageStorage } from "../storage/languageStorage";
import { DEFAULT_LANGUAGE, isLanguage } from "../i18n/translate";
import type { Language } from "../i18n/i18n.types";

export const languageService = {
  /** The visitor's saved choice, otherwise English. */
  initial(): Language {
    const stored = languageStorage.get();
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  },

  save: (lang: Language) => languageStorage.set(lang),
};
