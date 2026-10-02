import type { EncounterGroup } from "./encounter.types";
import type { Log } from "./log.types";

/** Why a single link or uploaded file could not be imported. */
export type SubmitErrorCode = "INVALID_LINK" | "FETCH_FAILED" | "DPS_REPORT_UPLOAD_FAILED";

/** The stored log plus the wing/fractal/strike it belongs to (null if unrecognised). */
export interface ImportedLog {
  logId: string;
  bossName: string;
  success: boolean;
  log: Log;
  group: EncounterGroup | null;
}

/** Why a log was deliberately not imported. */
export type SubmitSkipReason = "EMPTY_LOG";

export type SubmitResult =
  | ({ url: string; status: "ok" } & ImportedLog)
  | ({ url: string; status: "duplicate" } & ImportedLog)
  /** Not saved on purpose (e.g. an empty log the user chose to skip); the uploader and addon drop it from their list. */
  | { url: string; status: "skipped"; reason: SubmitSkipReason }
  | { url: string; status: "error"; code: SubmitErrorCode; message: string };

export interface SubmitLogsResponse {
  results: SubmitResult[];
}

/** POST /logs/upload: the imported log, or why the file could not be uploaded / imported. */
export interface UploadLogFileResponse {
  fileName: string;
  result: SubmitResult;
}
