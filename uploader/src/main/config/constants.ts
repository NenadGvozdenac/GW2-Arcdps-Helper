export const DPS_REPORT_UPLOAD_URL = "https://dps.report/uploadContent";

/** ArcDPS writes compressed .zevtc files (older setups: .evtc / .evtc.zip). */
export const LOG_EXTENSIONS = [".zevtc", ".evtc", ".evtc.zip"];

/** A new file counts as finished once its size has not changed for this long. */
export const FILE_STABLE_MS = 2_000;
export const FILE_WAIT_TIMEOUT_MS = 120_000;

export const DPS_REPORT_ATTEMPTS = 3;
export const DPS_REPORT_TIMEOUT_MS = 120_000;
export const BACKEND_TIMEOUT_MS = 60_000;

/** How many upload entries are kept in history. */
export const MAX_UPLOADS_KEPT = 200;
