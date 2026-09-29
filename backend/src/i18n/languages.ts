/**
 * Languages the backend writes emails in (the website sends its current language). To add one: add it here and add
 * its messages in ./locales (and to MESSAGES in ./messages.ts).
 */
export const LANGUAGES = ["en", "sr", "de"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "en";
