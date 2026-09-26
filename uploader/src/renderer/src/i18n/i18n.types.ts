import type { en } from "./locales/en";

type DeepStrings<T> = { [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

/** Shape every locale must implement (same keys as `en`, any string values). */
export type Messages = DeepStrings<typeof en>;

type Paths<T, Prefix extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

/** Dotted key into the messages tree, e.g. "login.signIn". */
export type TranslationKey = Paths<Messages>;

export type TranslateParams = Record<string, string | number>;

export type Translate = (key: TranslationKey, params?: TranslateParams) => string;
