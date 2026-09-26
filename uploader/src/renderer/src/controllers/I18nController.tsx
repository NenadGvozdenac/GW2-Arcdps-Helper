import { useEffect, useMemo } from "react";
import { uploaderBridge } from "../repositories/uploaderBridge";
import { LANGUAGES, localeFor, translate } from "../i18n/translate";
import type { Translate } from "../i18n/i18n.types";
import type { Language } from "../../../shared/settings.types";
import { createFormatters } from "../presentation/utils/format";
import { useAppState } from "./AppStateController";

/** The language lives in the main-process settings, so the tray and notifications follow it too. */
export function useI18n() {
  const { settings } = useAppState();
  const lang = settings.language;

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return useMemo(() => {
    const t: Translate = (key, params) => translate(lang, key, params);
    return {
      lang,
      languages: LANGUAGES,
      setLang: (next: Language) => uploaderBridge.saveSettings({ language: next }),
      t,
      fmt: createFormatters(localeFor(lang)),
    };
  }, [lang]);
}
