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

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Order of the `|`-separated plural forms in a message, per language. */
const PLURAL_FORMS: Record<Language, Intl.LDMLPluralRule[]> = {
  en: ["one", "other"],
  sr: ["one", "few", "other"],
};

/** Picks the plural form for `count` from "one|other" (en) or "one|few|other" (sr); the last form is the fallback. */
function pluralize(lang: Language, template: string, count: number): string {
  const forms = template.split("|");
  const category = new Intl.PluralRules(localeFor(lang)).select(count);
  const index = PLURAL_FORMS[lang].indexOf(category);
  return forms[index >= 0 && index < forms.length ? index : forms.length - 1];
}

/** Resolves a key for `lang` (falling back to English), picks the plural form by `count` and fills `{placeholders}`. */
export function translate(lang: Language, key: TranslationKey, params?: TranslateParams): string {
  let template = lookup(MESSAGES[lang], key) ?? lookup(en, key) ?? key;
  if (typeof params?.count === "number" && template.includes("|")) template = pluralize(lang, template, params.count);
  return params ? template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : template;
}
