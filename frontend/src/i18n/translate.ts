import { en } from "./locales/en";
import { sr } from "./locales/sr";
import type { Language, Messages, TranslateParams, TranslationKey } from "./i18n.types";

export const LANGUAGES: { code: Language; label: string; locale: string }[] = [
  { code: "en", label: "English", locale: "en-GB" },
  { code: "sr", label: "Srpski", locale: "sr-Latn-RS" },
];

export const DEFAULT_LANGUAGE: Language = "en";

const MESSAGES: Record<Language, Messages> = { en, sr };

export const isLanguage = (value: unknown): value is Language => value === "en" || value === "sr";

export const localeFor = (lang: Language) => LANGUAGES.find((l) => l.code === lang)!.locale;

/** Picks Serbian for sr/sh/hr/bs/me browsers, English otherwise. */
export function detectLanguage(browserLanguages: readonly string[]): Language {
  const slavic = ["sr", "sh", "hr", "bs", "me", "cnr"];
  return browserLanguages.some((l) => slavic.includes(l.toLowerCase().split("-")[0])) ? "sr" : DEFAULT_LANGUAGE;
}

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Resolves a key for `lang` (falling back to English) and fills `{placeholders}`. */
export function translate(lang: Language, key: TranslationKey, params?: TranslateParams): string {
  const template = lookup(MESSAGES[lang], key) ?? lookup(en, key) ?? key;
  return params ? template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : template;
}
