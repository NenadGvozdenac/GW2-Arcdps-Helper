/** Backend base URL. "/api" works with the Vite dev proxy and the nginx proxy in Docker. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

/** Must match MAX_URLS_PER_CALL in backend/src/config/constants.ts */
export const MAX_URLS_PER_CALL = 10;

/** Logs per page on "All logs". */
export const LOGS_PAGE_SIZE = 20;
/** Sessions per page on "Sessions". */
export const SESSIONS_PAGE_SIZE = 10;

/** How often the log list is re-fetched while the tab is visible. */
export const POLL_INTERVAL_MS = 30_000;
/** How long a newly arrived log stays highlighted. */
export const FRESH_HIGHLIGHT_MS = 8_000;

export const TOKEN_STORAGE_KEY = "gw2arcdpshelper.token";
export const LANGUAGE_STORAGE_KEY = "gw2arcdpshelper.lang";

/** ArcDPS log files accepted by the file picker (same list as LOG_FILE_EXTENSIONS in the backend). */
export const LOG_FILE_EXTENSIONS = [".zevtc", ".evtc", ".zip"];
/** Log files sent to the backend at the same time (each one is uploaded to dps.report there). */
export const PARALLEL_FILE_UPLOADS = 2;

/** Same pattern as DISCORD_WEBHOOK_RE in backend/src/config/constants.ts. */
export const DISCORD_WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export const SOURCE_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper";
/** Built by .github/workflows/build-uploader.yml for every uploader-v* tag. */
export const UPLOADER_DOWNLOAD_URL = `${SOURCE_URL}/releases/latest`;
