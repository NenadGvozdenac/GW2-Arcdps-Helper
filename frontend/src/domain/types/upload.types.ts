export type SubmitErrorCode = "INVALID_LINK" | "FETCH_FAILED";

export type SubmitResult =
  | { url: string; status: "ok"; logId: string; bossName: string; success: boolean }
  | { url: string; status: "duplicate"; logId: string }
  | { url: string; status: "error"; code: SubmitErrorCode; message: string };

export interface SubmitLogsResponse {
  results: SubmitResult[];
}

export interface UploadSummary {
  added: number;
  duplicates: number;
  failed: number;
}
