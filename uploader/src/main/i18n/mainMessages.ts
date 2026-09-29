import type { Language } from "../../shared/languages";
import { de } from "./locales/de";
import { en, type MainMessages } from "./locales/en";
import { sr } from "./locales/sr";

export type { MainMessages } from "./locales/en";

const MESSAGES: Record<Language, MainMessages> = { en, sr, de };

/** Main-process strings (tray, notifications, dialogs) in `lang`, English for anything unknown. */
export const mainT = (lang: Language): MainMessages => MESSAGES[lang] ?? en;
