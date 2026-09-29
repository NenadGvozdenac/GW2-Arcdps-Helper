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

/**
 * Updates: releases are tagged uploader-vX.Y.Z (the Nexus addon shares the repository with plain vX.Y.Z tags, so
 * GitHub's "latest release" can't be used). The newest tag is read from the repository's git refs — the endpoint
 * `git fetch` uses — rather than the REST API, whose 60 requests/hour per IP are shared with Nexus' update checks.
 */
export const GIT_REFS_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper.git/info/refs?service=git-upload-pack";
export const RELEASES_DOWNLOAD_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper/releases/download";
export const RELEASE_PAGE_URL = "https://github.com/NenadGvozdenac/GW2-Arcdps-Helper/releases/tag";
export const UPDATE_FIRST_CHECK_MS = 10_000;
export const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60_000;

/** How often "End session" checks whether the session's uploads have finished. */
export const SESSION_DRAIN_POLL_MS = 1_000;
/** How often the active session is re-checked (the backend ends sessions after 6 hours, or one may end on the website). */
export const SESSION_REFRESH_MS = 60_000;
/** How often the weekly raid clear is re-loaded (it is also re-loaded after every uploaded kill). */
export const CLEARS_REFRESH_MS = 5 * 60_000;
