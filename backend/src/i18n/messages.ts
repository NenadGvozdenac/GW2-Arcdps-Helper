import type { Language } from "./languages";
import { de } from "./locales/de";
import { en, type EmailMessages } from "./locales/en";
import { sr } from "./locales/sr";

export type { EmailMessages } from "./locales/en";

const MESSAGES: Record<Language, EmailMessages> = { en, sr, de };

export const emailMessages = (lang: Language): EmailMessages => MESSAGES[lang];
