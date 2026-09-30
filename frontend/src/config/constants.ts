/** Backend base URL. "/api" works with the Vite dev proxy and the nginx proxy in Docker. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

/** Must match MAX_URLS_PER_CALL in backend/src/config/constants.ts */
export const MAX_URLS_PER_CALL = 10;

/** Logs per page on "All logs" by default (fetched from the server one page at a time). */
export const LOGS_PAGE_SIZE = 20;
/** Page sizes to choose from on "All logs" (the backend allows at most 100). */
export const LOGS_PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
/** Pause in typing before the log search is sent to the server. */
export const SEARCH_DEBOUNCE_MS = 300;
/** Sessions per page on "Sessions". */
export const SESSIONS_PAGE_SIZE = 10;

/** How often the log list is re-fetched while the tab is visible. */
export const POLL_INTERVAL_MS = 30_000;
/** How long a newly arrived log stays highlighted. */
export const FRESH_HIGHLIGHT_MS = 8_000;

export const TOKEN_STORAGE_KEY = "gw2arcdpshelper.token";
export const LANGUAGE_STORAGE_KEY = "gw2arcdpshelper.lang";
export const LOGS_PAGE_SIZE_STORAGE_KEY = "gw2arcdpshelper.logsPageSize";
export const DOWNLOADS_STORAGE_KEY = "gw2arcdpshelper.downloads";
export const SESSION_RESULT_FILTER_STORAGE_KEY = "gw2arcdpshelper.sessionResultFilter";
/** + ".<userId>": the overview's "finish your setup" tip was closed for that account. */
export const SETUP_TIP_DISMISSED_STORAGE_KEY = "gw2arcdpshelper.setupTipDismissed";
/**
 * How long the latest download links are reused before GitHub is asked again. The public GitHub API allows 60
 * requests per hour per IP, shared with Nexus' update check on the same PC.
 */
export const DOWNLOADS_CACHE_MS = 30 * 60_000;

/** ArcDPS log files accepted by the file picker (same list as LOG_FILE_EXTENSIONS in the backend). */
export const LOG_FILE_EXTENSIONS = [".zevtc", ".evtc", ".zip"];
/** Log files sent to the backend at the same time (each one is uploaded to dps.report there). */
export const PARALLEL_FILE_UPLOADS = 2;

/** Same pattern as DPS_REPORT_TOKEN_RE in backend/src/config/constants.ts. */
export const DPS_REPORT_TOKEN_RE = /^[A-Za-z0-9]{8,64}$/;
/** Shows the dps.report user token of the browser's dps.report session (as JSON). */
export const DPS_REPORT_TOKEN_URL = "https://dps.report/getUserToken";

/** Same pattern as DISCORD_WEBHOOK_RE in backend/src/config/constants.ts. */
export const DISCORD_WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

export const SOURCE_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper";
/** Uploader (uploader-v* tags) and Nexus addon (v* tags) builds, see .github/workflows. */
/** Where the Privacy Policy and Terms of Service send questions and data requests. */
export const LEGAL_CONTACT_URL = `${SOURCE_URL}/issues`;

export const RELEASES_URL = `${SOURCE_URL}/releases`;
/**
 * Fixed download links: every release also refreshes the "uploader-latest" / "addon-latest" release with stable file
 * names (see .github/workflows), so the buttons work without the GitHub API.
 */
export const UPLOADER_DOWNLOAD_URL = `${RELEASES_URL}/download/uploader-latest/GW2-ArcDPS-Helper-Uploader-Setup.exe`;
export const ADDON_DOWNLOAD_URL = `${RELEASES_URL}/download/addon-latest/gw2-arcdps-helper.dll`;
export const GITHUB_RELEASES_API_URL = "https://api.github.com/repos/NenadGvozdenac/GW2-Arcdps-Helper/releases?per_page=30";
