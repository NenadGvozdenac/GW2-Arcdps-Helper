/** Backend base URL. "/api" works with the Vite dev proxy and the nginx proxy in Docker. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

/** Must match MAX_URLS_PER_CALL in backend/src/config/constants.ts */
export const MAX_URLS_PER_CALL = 10;

export const LOGS_PAGE_SIZE = 50;

/** How often the log list is re-fetched while the tab is visible. */
export const POLL_INTERVAL_MS = 30_000;
/** How long a newly arrived log stays highlighted. */
export const FRESH_HIGHLIGHT_MS = 8_000;

export const TOKEN_STORAGE_KEY = "gw2arcdpshelper.token";
export const LANGUAGE_STORAGE_KEY = "gw2arcdpshelper.lang";
