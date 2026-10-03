import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { RATE_LIMITS } from "../config/constants";
import { env } from "../config/env";
import { adminDisabled, invalidCredentials, tooManyLoginAttempts } from "../utils/httpError";
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

/**
 * The administrator's sign-in: email, password and a code from their authenticator app, all three every time.
 * Throttled per IP and overall; each code works once.
 */
export const adminAuthService = {
  hashPassword,

  async login(email: string, password: string, code: string, ipHash: string): Promise<{ token: string }> {
    const admin = env.admin;
    if (!admin) throw adminDisabled();
    const ipKey = `admin-login-ip:${ipHash}`;
    const [ipLimited, allLimited] = await Promise.all([
      rateLimitService.isLimited(ipKey, RATE_LIMITS.adminLoginIp),
      rateLimitService.isLimited("admin-login", RATE_LIMITS.adminLogin),
    ]);
    if (ipLimited || allLimited) throw tooManyLoginAttempts();

    const emailOk = email.trim().toLowerCase() === admin.email;
    const passwordOk = await passwordMatches(password, admin.passwordHash);
    const step = totp.matchingStep(admin.totpSecret, code);
    // A code used once (its 30-second step) is refused afterwards, so an intercepted code can't be replayed. Only a
    // sign-in with the right email and password uses it up: a typo in the password doesn't cost the code.
    const fresh =
      emailOk && passwordOk && step !== null && (await rateLimitService.take(`admin-totp:${step}`, RATE_LIMITS.adminTotpStep));
    if (!emailOk || !passwordOk || !fresh) {
      await Promise.all([
        rateLimitService.take(ipKey, RATE_LIMITS.adminLoginIp),
        rateLimitService.take("admin-login", RATE_LIMITS.adminLogin),
      ]);
      throw invalidCredentials();
    }
    return { token: tokenService.signAdmin(admin) };
  },

  /** The configured admin's email (for the admin page header). */
  me(): { email: string } {
    const admin = env.admin;
    if (!admin) throw adminDisabled();
    return { email: admin.email };
  },
};
