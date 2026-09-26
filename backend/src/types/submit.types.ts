import type { EncounterGroup } from "./encounter.types";
import type { Log } from "./log.types";

/** Why a single link could not be imported. */
export type SubmitErrorCode = "INVALID_LINK" | "FETCH_FAILED";

/** The stored log plus the wing/fractal/strike it belongs to (null if unrecognised). */
export interface ImportedLog {
  logId: string;
  bossName: string;
  success: boolean;
  log: Log;
  group: EncounterGroup | null;
}

export type SubmitResult =
  | ({ url: string; status: "ok" } & ImportedLog)
  | ({ url: string; status: "duplicate" } & ImportedLog)
  | { url: string; status: "error"; code: SubmitErrorCode; message: string };

export interface SubmitLogsResponse {
  results: SubmitResult[];
}
