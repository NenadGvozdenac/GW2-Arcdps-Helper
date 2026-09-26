import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { languageService } from "../services/languageService";
import { LANGUAGES, localeFor, translate } from "../i18n/translate";
import type { Language, Translate } from "../i18n/i18n.types";
import { createFormatters, type Formatters } from "../presentation/utils/format";

interface I18nContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  languages: typeof LANGUAGES;
  t: Translate;
  fmt: Formatters;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(languageService.initial);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    languageService.save(next);
    setLangState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      setLang,
      languages: LANGUAGES,
      t: (key, params) => translate(lang, key, params),
      fmt: createFormatters(localeFor(lang)),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
