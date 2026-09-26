import type { IpcError } from "../../../../shared/app.types";
import { isKnownErrorCode } from "../../i18n/translate";
import type { Translate } from "../../i18n/i18n.types";

/** Translates an error code from the main process; unknown codes fall back to a generic message. */
export function describeError(error: IpcError | string, t: Translate): string {
  const code = typeof error === "string" ? error : error.code;
  return isKnownErrorCode(code) ? t(`errors.${code}`) : t("errors.UNKNOWN");
}
