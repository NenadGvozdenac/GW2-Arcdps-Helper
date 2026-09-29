import { de } from "./locales/de";
import { en } from "./locales/en";
import { sr } from "./locales/sr";
import { LANGUAGES, type Language } from "../../../shared/languages";
import type { Messages, TranslateParams, TranslationKey } from "./i18n.types";

export { LANGUAGES } from "../../../shared/languages";

const MESSAGES: Record<Language, Messages> = { en, sr, de };

export const localeFor = (lang: Language) => LANGUAGES.find((l) => l.code === lang)?.locale ?? "en-GB";

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

/** Error codes from the main process / backend that have a translation. */
export function isKnownErrorCode(code: string): code is keyof Messages["errors"] {
  return code in en.errors;
}
