/**
 * Every language of the app, shared by the main process (tray, notifications) and the window. To add one: add it
 * here, add its messages in main/i18n/locales and renderer/src/i18n/locales, and its flag in LanguageFlag.tsx.
 */
export const LANGUAGES = [
  { code: "en", label: "English", locale: "en-GB" },
  { code: "sr", label: "Srpski", locale: "sr-Latn-RS" },
  { code: "de", label: "Deutsch", locale: "de-DE" },
] as const;

export type Language = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "en";

export const isLanguage = (value: unknown): value is Language => LANGUAGES.some((l) => l.code === value);
