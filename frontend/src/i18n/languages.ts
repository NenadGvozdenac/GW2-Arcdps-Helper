/**
 * Every language of the website. To add one: add it here, add its messages in ./locales (and to MESSAGES in
 * translate.ts) and its flag in presentation/components/LanguageFlag.tsx.
 */
export const LANGUAGES = [
  // `plurals`: order of the `|`-separated forms in plural messages ("one|other", "one|few|other").
  { code: "en", label: "English", locale: "en-GB", plurals: ["one", "other"] },
  { code: "sr", label: "Srpski", locale: "sr-Latn-RS", plurals: ["one", "few", "other"] },
  { code: "de", label: "Deutsch", locale: "de-DE", plurals: ["one", "other"] },
] as const satisfies readonly { code: string; label: string; locale: string; plurals: readonly Intl.LDMLPluralRule[] }[];

export type Language = (typeof LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: Language = "en";
