/**
 * - idle: up to date (or not checked yet)
 * - downloading: a newer version is being downloaded in the background
 * - ready: downloaded; installed on "Restart and update" or when the app quits
 * - available: newer version exists but can't be installed automatically (portable exe) — download it by hand
 */
export type UpdateStatus = "idle" | "downloading" | "ready" | "available";

export interface UpdateState {
  status: UpdateStatus;
  /** The newer version, e.g. "0.2.0". */
  version: string | null;
  /** Download progress 0–100 while downloading. */
  progress: number | null;
  /** Release page, for the portable exe. */
  downloadUrl: string | null;
}
