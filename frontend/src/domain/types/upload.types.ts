export type SubmitErrorCode = "INVALID_LINK" | "FETCH_FAILED" | "DPS_REPORT_UPLOAD_FAILED";

export type SubmitResult =
  | { url: string; status: "ok"; logId: string; bossName: string; success: boolean }
  | { url: string; status: "duplicate"; logId: string }
  | { url: string; status: "error"; code: SubmitErrorCode; message: string };

export interface SubmitLogsResponse {
  results: SubmitResult[];
}

/** POST /logs/upload: the backend uploads the file to dps.report and imports it. */
export interface UploadLogFileResponse {
  fileName: string;
  result: SubmitResult;
}

/** Where one picked log file is in the upload → import pipeline. */
export type FileUploadStage = "queued" | "uploading" | "done" | "failed";

export interface FileUpload {
  id: string;
  file: File;
  stage: FileUploadStage;
  /** Import result once the file reached our backend ("ok", "duplicate" or "error"). */
  result?: SubmitResult;
  /** Set when stage is "failed". */
  error?: unknown;
}

export interface UploadSummary {
  added: number;
  duplicates: number;
  failed: number;
}
