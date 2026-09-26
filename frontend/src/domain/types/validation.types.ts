import type { TranslationKey } from "../../i18n/i18n.types";

/** Client-side validation failure; `key` is translated by the presentation layer. */
export class ValidationError extends Error {
  constructor(public readonly key: TranslationKey) {
    super(key);
  }
}
