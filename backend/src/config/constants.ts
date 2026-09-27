export const DPS_REPORT_BASE_URL = "https://dps.report";
/** dps.report parses the log while the upload request is open, which can take a while for big fights. */
export const DPS_REPORT_UPLOAD_TIMEOUT_MS = 120_000;

/** ArcDPS log files accepted by POST /logs/upload. */
export const LOG_FILE_EXTENSIONS = [".zevtc", ".evtc", ".zip"];
/** Upper bound for one uploaded log file (Vercel itself rejects request bodies over ~4.5 MB). */
export const MAX_LOG_FILE_BYTES = 50 * 1024 * 1024;

/** Kept small so one request fits comfortably in a Vercel function's time limit. */
export const MAX_URLS_PER_CALL = 10;
export const PARALLEL_FETCHES = 4;

/**
 * Only real Discord webhook URLs are accepted — the server posts to this URL, so anything else would let users
 * make it call arbitrary addresses.
 */
export const DISCORD_WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
export const DISCORD_TIMEOUT_MS = 5_000;
/** Discord allows at most 10 embeds per message. */
export const DISCORD_MAX_EMBEDS = 10;
export const DISCORD_USERNAME = "GW2 ArcDPS Helper";
/** Discord's limit for an embed description; longer session summaries are cut with "… and N more". */
export const DISCORD_DESCRIPTION_LIMIT = 4096;

export const SESSION_NAME_MAX = 80;
/** A session that isn't ended within this time is ended automatically (and can then be resumed). */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;

export const JWT_EXPIRES_IN = "30d";
export const BCRYPT_ROUNDS = 10;
