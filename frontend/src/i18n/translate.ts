import { de } from "./locales/de";
import { en } from "./locales/en";
import { sr } from "./locales/sr";
import { LANGUAGES, type Language } from "./languages";
import type { Messages, TranslateParams, TranslationKey } from "./i18n.types";

export { DEFAULT_LANGUAGE, LANGUAGES } from "./languages";

const MESSAGES: Record<Language, Messages> = { en, sr, de };

const languageInfo = (lang: Language) => LANGUAGES.find((l) => l.code === lang)!;

export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.code === value);

export const localeFor = (lang: Language) => languageInfo(lang).locale;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/** Picks the plural form for `count` in the language's order (see `plurals` in languages.ts); the last form is the fallback. */
function pluralize(lang: Language, template: string, count: number): string {
  const forms = template.split("|");
  const category = new Intl.PluralRules(localeFor(lang)).select(count);
  const index = (languageInfo(lang).plurals as readonly Intl.LDMLPluralRule[]).indexOf(category);
  return forms[index >= 0 && index < forms.length ? index : forms.length - 1];
}

/** Resolves a key for `lang` (falling back to English), picks the plural form by `count` and fills `{placeholders}`. */
export function translate(lang: Language, key: TranslationKey, params?: TranslateParams): string {
  let template = lookup(MESSAGES[lang], key) ?? lookup(en, key) ?? key;
  if (typeof params?.count === "number" && template.includes("|")) template = pluralize(lang, template, params.count);
  return params ? template.replace(/\{(\w+)\}/g, (m, name) => (name in params ? String(params[name]) : m)) : template;
}
