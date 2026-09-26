export const DPS_REPORT_BASE_URL = "https://dps.report";

/** Kept small so one request fits comfortably in a Vercel function's time limit. */
export const MAX_URLS_PER_CALL = 10;
export const PARALLEL_FETCHES = 4;

export const JWT_EXPIRES_IN = "30d";
export const BCRYPT_ROUNDS = 10;
