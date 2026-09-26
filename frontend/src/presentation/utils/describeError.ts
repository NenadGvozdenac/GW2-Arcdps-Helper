import { ApiError } from "../../domain/types/api.types";
import { ValidationError } from "../../domain/types/validation.types";
import type { Translate } from "../../i18n/i18n.types";

/** Turns any thrown error into a message in the current language. */
export function describeError(err: unknown, t: Translate): string {
  if (err instanceof ValidationError) return t(err.key);
  if (err instanceof ApiError) return t(`errors.${err.code}`);
  return t("errors.unknown");
}
