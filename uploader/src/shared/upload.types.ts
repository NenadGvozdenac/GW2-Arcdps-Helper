/** Where a single log file is in the upload pipeline. */
export type UploadStage =
  | "queued" // detected, waiting for ArcDPS to finish writing / for its turn
  | "uploading" // sending the file to dps.report
  | "syncing" // sending the permalink to GW2 ArcDPS Helper
  | "done"
  | "failed";

/** Why an upload failed; translated in the renderer. */
export type UploadErrorCode =
  | "DPS_REPORT_FAILED" // dps.report rejected the file or is down
  | "SYNC_FAILED" // uploaded to dps.report, but GW2 ArcDPS Helper did not accept it
  | "NOT_SIGNED_IN"
  | "FILE_UNREADABLE";

export interface UploadEntry {
  id: string;
  filePath: string;
  fileName: string;
  detectedAt: string; // ISO
  stage: UploadStage;
  errorCode: UploadErrorCode | null;
  errorDetail: string | null;

  /** Session that was active when the log was detected; the log is attached to it on the website. */
  sessionId?: string | null;

  // Filled once dps.report accepts the file
  permalink: string | null;
  bossName: string | null;
  success: boolean | null;
  isCM: boolean;
  isLegendaryCM: boolean;
  durationMs: number | null;
  encounterStart: string | null; // ISO

  // Filled once GW2 ArcDPS Helper stores it
  webLogId: string | null;
  encounterKey: string | null;
  groupName: string | null;
}
