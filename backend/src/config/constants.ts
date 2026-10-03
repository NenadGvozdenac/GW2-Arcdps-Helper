export const DPS_REPORT_BASE_URL = "https://dps.report";
/** dps.report parses the log while the upload request is open, which can take a while for big fights. */
export const DPS_REPORT_UPLOAD_TIMEOUT_MS = 120_000;

/** ArcDPS log files accepted by POST /logs/upload. */
export const LOG_FILE_EXTENSIONS = [".zevtc", ".evtc", ".zip"];
/** Upper bound for one uploaded log file (Vercel itself rejects request bodies over ~4.5 MB). */
export const MAX_LOG_FILE_BYTES = 50 * 1024 * 1024;

/** Kept small so one request fits comfortably in a Vercel function's time limit. */
export const MAX_URLS_PER_CALL = 10;
/** Logs per page of GET /logs/search. */
export const LOGS_PAGE_SIZE = 20;
export const LOGS_PAGE_SIZE_MAX = 100;
/** Sessions per page of GET /sessions/page. */
export const SESSIONS_PAGE_SIZE = 10;
export const SESSIONS_PAGE_SIZE_MAX = 100;
export const PARALLEL_FETCHES = 4;

/** Elite Insights buff ids of the boons stored per player (see PlayerSummary.boons). */
export const BOON_IDS = {
  might: 740,
  fury: 725,
  quickness: 1187,
  alacrity: 30328,
  protection: 717,
  regeneration: 718,
  vigor: 726,
  aegis: 743,
  stability: 1122,
  swiftness: 719,
  resistance: 26980,
  resolution: 873,
} as const;

/**
 * Only real Discord webhook URLs are accepted — the server posts to this URL, so anything else would let users
 * make it call arbitrary addresses.
 */
/** dps.report user tokens are short alphanumeric strings (e.g. 32 characters). Same pattern in the frontend. */
export const DPS_REPORT_TOKEN_RE = /^[A-Za-z0-9]{8,64}$/;
export const DISCORD_WEBHOOK_RE = /^https:\/\/(?:(?:canary|ptb)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
export const DISCORD_TIMEOUT_MS = 5_000;
/** A user can connect a second webhook, so logs and session summaries go to different channels. */
export const DISCORD_MAX_WEBHOOKS = 2;
/** Session filter of a webhook: how many accounts it may list, and how many of them a log needs by default. */
export const DISCORD_MAX_FILTER_ACCOUNTS = 10;
export const DISCORD_DEFAULT_MIN_ACCOUNTS = 3;
/** Discord allows at most 10 embeds per message. */
export const DISCORD_MAX_EMBEDS = 10;
export const DISCORD_USERNAME = "GW2 ArcDPS Helper";
/** Discord's limit for an embed description; longer session summaries are cut with "… and N more". */
export const DISCORD_DESCRIPTION_LIMIT = 4096;

export const SESSION_NAME_MAX = 80;
/** A session that isn't ended within this time is ended automatically (and can then be resumed). */
export const SESSION_TTL_MS = 6 * 60 * 60 * 1000;
/** Random bytes in a session share token (base64url-encoded in the link): unguessable, like a secret. */
export const SHARE_TOKEN_BYTES = 18;

export const JWT_EXPIRES_IN = "30d";
/** Lifetime of the link in the confirmation email. */
export const EMAIL_VERIFICATION_EXPIRES_IN = "24h";
/** Lifetime of the link in the password-reset email. */
export const PASSWORD_RESET_EXPIRES_IN = "1h";
/** How long an app has to be approved on the website ("Sign in with the browser"). */
export const APP_LOGIN_TTL_MS = 5 * 60_000;
/** Random bytes of the secret an app keeps to collect its sign-in. */
export const APP_LOGIN_SECRET_BYTES = 32;
/** Characters of the code shown in the app and on the website - no 0/O, 1/I that are easy to mix up. */
export const APP_LOGIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SMTP_TIMEOUT_MS = 15_000;
/** Where feedback from the website, the desktop uploader and the Nexus addon is emailed. */
export const FEEDBACK_EMAIL = "nenadgvozdenacsrb@gmail.com";
export const FEEDBACK_TITLE_MAX = 120;
export const FEEDBACK_DESCRIPTION_MAX = 5000;
/** Name shown as the sender of our emails; the address is SMTP_USER. */
export const EMAIL_SENDER_NAME = "GW2 ArcDPS Helper";
export const BCRYPT_ROUNDS = 10;

/** At most `max` hits per `windowMs` (see rateLimitService). */
export interface RateLimit {
  max: number;
  windowMs: number;
}

export const RATE_LIMITS = {
  /** Wrong passwords for one email from one IP; then that IP can't sign in to it until the window ends. */
  loginAccount: { max: 10, windowMs: 15 * 60_000 },
  /** Wrong passwords from one IP over all emails (trying many accounts). */
  loginIp: { max: 50, windowMs: 15 * 60_000 },
  /** Confirmation / password-reset emails per account. */
  verificationEmail: { max: 1, windowMs: 60_000 },
  passwordResetEmail: { max: 1, windowMs: 60_000 },
  /** Discord test messages per user - the URL can be any webhook, so it must not be a spam relay. */
  discordTest: { max: 5, windowMs: 10 * 60_000 },
  /** Feedback per IP (signed in or not). */
  feedback: { max: 1, windowMs: 60_000 },
} satisfies Record<string, RateLimit>;
