import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { RATE_LIMITS } from "../config/constants";
import { env } from "../config/env";
import { adminDisabled, invalidCredentials, invalidOtpCode, otpChallengeExpired, tooManyLoginAttempts } from "../utils/httpError";
import { totp } from "./misc/totp";
import { rateLimitService } from "./rateLimitService";
import { tokenService } from "./tokenService";

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEY_LENGTH = 64;

/** "scrypt:<salt hex>:<hash hex>" - no `$` or quotes, so it goes into any .env file or hosting dashboard as is. */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

async function passwordMatches(password: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Throttles the admin sign-in per IP and overall; wrong passwords and wrong codes count alike. */
async function throttle(ipHash: string): Promise<{ refused: () => Promise<void> }> {
  const ipKey = `admin-login-ip:${ipHash}`;
  const [ipLimited, allLimited] = await Promise.all([
    rateLimitService.isLimited(ipKey, RATE_LIMITS.adminLoginIp),
    rateLimitService.isLimited("admin-login", RATE_LIMITS.adminLogin),
  ]);
  if (ipLimited || allLimited) throw tooManyLoginAttempts();
  return {
    refused: async () => {
      await Promise.all([
        rateLimitService.take(ipKey, RATE_LIMITS.adminLoginIp),
        rateLimitService.take("admin-login", RATE_LIMITS.adminLogin),
      ]);
    },
  };
}

function configuredAdmin() {
  const admin = env.admin;
  if (!admin) throw adminDisabled();
  return admin;
}

/**
 * The administrator's sign-in, in two steps: email + password give a short-lived challenge, which together with a
 * code from the authenticator app gives the admin token. Throttled per IP and overall; each code works once.
 */
export const adminAuthService = {
  hashPassword,

  /** Step 1: right email and password -> `{ challenge }` for step 2 (valid ADMIN_CHALLENGE_EXPIRES_IN). */
  async login(email: string, password: string, ipHash: string): Promise<{ challenge: string }> {
    const admin = configuredAdmin();
    const limit = await throttle(ipHash);
    const emailOk = email.trim().toLowerCase() === admin.email;
    const passwordOk = await passwordMatches(password, admin.passwordHash);
    if (!emailOk || !passwordOk) {
      await limit.refused();
      throw invalidCredentials();
    }
    return { challenge: tokenService.signAdminChallenge(admin) };
  },

  /** Step 2: the challenge from step 1 and the current authenticator code -> `{ token }`. */
  async verify(challenge: string, code: string, ipHash: string): Promise<{ token: string }> {
    const admin = configuredAdmin();
    const limit = await throttle(ipHash);
    if (!tokenService.verifyAdminChallenge(challenge, admin)) throw otpChallengeExpired();
    const step = totp.matchingStep(admin.totpSecret, code);
    // A code used once (its 30-second step) is refused afterwards, so an intercepted code can't be replayed.
    const fresh = step !== null && (await rateLimitService.take(`admin-totp:${step}`, RATE_LIMITS.adminTotpStep));
    if (!fresh) {
      await limit.refused();
      throw invalidOtpCode();
    }
    return { token: tokenService.signAdmin(admin) };
  },

  /** The configured admin's email (for the admin page header). */
  me(): { email: string } {
    return { email: configuredAdmin().email };
  },
};
