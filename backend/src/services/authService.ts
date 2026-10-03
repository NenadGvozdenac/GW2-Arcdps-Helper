import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, RATE_LIMITS } from "../config/constants";
import { userRepository } from "../repositories/userRepository";
import type { AuthResponse, EmailLanguage, RegisterInput, RegisterResponse } from "../types/auth.types";
import type { User } from "../types/user.types";
import {
  accountBlocked,
  emailNotVerified,
  emailTaken,
  invalidCredentials,
  invalidResetLink,
  invalidVerificationLink,
  tooManyLoginAttempts,
} from "../utils/httpError";
import { emailService } from "./emailService";
import { rateLimitService } from "./rateLimitService";
import { tokenService } from "./tokenService";
import { userIpService } from "./userIpService";

// Compared against when the email doesn't exist, so response time doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

/**
 * Wrong passwords are counted per email (hashed - also unknown ones, so a lock doesn't reveal which are registered)
 * and IP: someone guessing from their own IP can't lock the owner out on theirs.
 */
const loginKeyPrefix = (email: string) =>
  `login:${createHash("sha256").update(email.trim().toLowerCase()).digest("hex")}:`;
/** Wrong passwords from one IP across all emails (guessing many accounts). */
const loginIpKey = (ipHash: string) => `login-ip:${ipHash}`;
const verificationEmailKey = (userId: string) => `verification-email:${userId}`;

/** Issues a sign-in token and remembers the address it went to (for the administrator's IP blocking). */
async function signIn(user: User, ipHash: string): Promise<AuthResponse> {
  await userIpService.record(user.id, ipHash);
  return { token: tokenService.sign(user.id), user };
}

/** Sends the confirmation link; false (nothing sent) when one went out less than a minute ago. */
async function sendVerificationEmail(user: User, language: EmailLanguage): Promise<boolean> {
  if (!(await rateLimitService.take(verificationEmailKey(user.id), RATE_LIMITS.verificationEmail))) return false;
  const token = tokenService.signEmailVerification(user.id);
  await emailService.sendVerification(user.email, user.gw2Account || user.email, token, language);
  return true;
}

export const authService = {
  /** Creates an unconfirmed account and emails the confirmation link; signing in works only after it is clicked. */
  async register(input: RegisterInput): Promise<RegisterResponse> {
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      gw2Account: input.gw2Account,
      termsAcceptedAt: new Date(),
    });
    if (!user) throw emailTaken();
    await sendVerificationEmail(user, input.language);
    return { email: user.email };
  },

  /**
   * Too many wrong passwords (RATE_LIMITS.loginAccount for this email from this IP, or RATE_LIMITS.loginIp from this
   * IP overall) lock signing in until the window ends - even with the right password, so guessing on can't tell when
   * it hit. Resetting the password lifts the per-email lock. A blocked account is refused once the password is right.
   */
  async login(email: string, password: string, ipHash: string): Promise<AuthResponse> {
    const accountKey = loginKeyPrefix(email) + ipHash;
    const ipKey = loginIpKey(ipHash);
    const [accountLimited, ipLimited] = await Promise.all([
      rateLimitService.isLimited(accountKey, RATE_LIMITS.loginAccount),
      rateLimitService.isLimited(ipKey, RATE_LIMITS.loginIp),
    ]);
    if (accountLimited || ipLimited) throw tooManyLoginAttempts();

    const row = await userRepository.findRowByEmail(email);
    const ok = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !ok) {
      await Promise.all([
        rateLimitService.take(accountKey, RATE_LIMITS.loginAccount),
        rateLimitService.take(ipKey, RATE_LIMITS.loginIp),
      ]);
      throw invalidCredentials();
    }
    if (row.blockedAt) throw accountBlocked();
    if (!row.emailVerifiedAt) throw emailNotVerified();
    await rateLimitService.clear(accountKey);
    return signIn((await userRepository.findById(row.id))!, ipHash);
  },

  /** Confirms the address from the emailed link and signs the user in. Opening the link again just signs in. */
  async verifyEmail(token: string, ipHash: string): Promise<AuthResponse> {
    const payload = tokenService.verifyEmailToken(token, "verify-email");
    const row = payload ? await userRepository.findRowById(payload.sub) : null;
    if (!row) throw invalidVerificationLink();
    if (row.blockedAt) throw accountBlocked();
    const user = row.emailVerifiedAt
      ? (await userRepository.findById(row.id))!
      : (await userRepository.update(row.id, { emailVerifiedAt: new Date() }))!;
    return signIn(user, ipHash);
  },

  /**
   * Sends a new confirmation link. Silently does nothing for unknown or already confirmed emails (so it doesn't
   * reveal which emails are registered) and when one was sent less than a minute ago.
   */
  async resendVerification(email: string, language: EmailLanguage): Promise<void> {
    const row = await userRepository.findRowByEmail(email);
    if (!row || row.emailVerifiedAt) return;
    await sendVerificationEmail((await userRepository.findById(row.id))!, language);
  },

  /** Emails a password-reset link; silent for unknown emails and when one was sent less than a minute ago. */
  async forgotPassword(email: string, language: EmailLanguage): Promise<void> {
    const row = await userRepository.findRowByEmail(email);
    if (!row || !(await rateLimitService.take(`password-reset-email:${row.id}`, RATE_LIMITS.passwordResetEmail))) {
      return;
    }
    const token = tokenService.signPasswordReset(row.id, row.passwordHash);
    await emailService.sendPasswordReset(row.email, row.gw2Account || row.email, token, language);
  },

  /**
   * Sets a new password from the emailed link and signs the user in. The link proves access to the inbox, so it
   * also confirms the email. It works once: the new password invalidates it. Every earlier sign-in (website, desktop
   * uploader, Nexus addon) is signed out, and a login lock is lifted.
   */
  async resetPassword(token: string, password: string, ipHash: string): Promise<AuthResponse> {
    const payload = tokenService.verifyEmailToken(token, "reset-password");
    const row = payload ? await userRepository.findRowById(payload.sub) : null;
    if (!payload || !row || !tokenService.matchesPassword(payload, row.passwordHash)) throw invalidResetLink();
    if (row.blockedAt) throw accountBlocked();
    const user = await userRepository.update(row.id, {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      emailVerifiedAt: row.emailVerifiedAt ?? new Date(),
      tokensValidAfter: new Date(),
    });
    if (!user) throw invalidResetLink();
    await rateLimitService.clearPrefix(loginKeyPrefix(row.email));
    return signIn(user, ipHash);
  },
};
