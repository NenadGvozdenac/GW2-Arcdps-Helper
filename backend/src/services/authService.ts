import bcrypt from "bcryptjs";
import { BCRYPT_ROUNDS, EMAIL_COOLDOWN_MS } from "../config/constants";
import { userRepository } from "../repositories/userRepository";
import type { AuthResponse, EmailLanguage, RegisterInput, RegisterResponse } from "../types/auth.types";
import type { User } from "../types/user.types";
import {
  emailNotVerified,
  emailTaken,
  invalidCredentials,
  invalidResetLink,
  invalidVerificationLink,
} from "../utils/httpError";
import { emailService } from "./emailService";
import { tokenService } from "./tokenService";

// Compared against when the email doesn't exist, so response time doesn't reveal registered emails.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", BCRYPT_ROUNDS);

const recentlySent = (sentAt: Date | null) => Date.now() - (sentAt?.getTime() ?? 0) < EMAIL_COOLDOWN_MS;

async function sendVerificationEmail(user: User, language: EmailLanguage): Promise<void> {
  await userRepository.update(user.id, { verificationEmailSentAt: new Date() });
  const token = tokenService.signEmailVerification(user.id);
  await emailService.sendVerification(user.email, user.gw2Account || user.email, token, language);
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

  async login(email: string, password: string): Promise<AuthResponse> {
    const row = await userRepository.findRowByEmail(email);
    const ok = await bcrypt.compare(password, row?.passwordHash ?? DUMMY_HASH);
    if (!row || !ok) throw invalidCredentials();
    if (!row.emailVerifiedAt) throw emailNotVerified();
    const user = (await userRepository.findById(row.id))!;
    return { token: tokenService.sign(user.id), user };
  },

  /** Confirms the address from the emailed link and signs the user in. Opening the link again just signs in. */
  async verifyEmail(token: string): Promise<AuthResponse> {
    const payload = tokenService.verifyEmailToken(token, "verify-email");
    const existing = payload ? await userRepository.findById(payload.sub) : null;
    if (!existing) throw invalidVerificationLink();
    const user = existing.emailVerifiedAt
      ? existing
      : ((await userRepository.update(existing.id, { emailVerifiedAt: new Date() })) ?? existing);
    return { token: tokenService.sign(user.id), user };
  },

  /**
   * Sends a new confirmation link. Silently does nothing for unknown or already confirmed emails (so it doesn't
   * reveal which emails are registered) and when one was sent less than a minute ago.
   */
  async resendVerification(email: string, language: EmailLanguage): Promise<void> {
    const row = await userRepository.findRowByEmail(email);
    if (!row || row.emailVerifiedAt || recentlySent(row.verificationEmailSentAt)) return;
    await sendVerificationEmail((await userRepository.findById(row.id))!, language);
  },

  /** Emails a password-reset link; silent for unknown emails and when one was sent less than a minute ago. */
  async forgotPassword(email: string, language: EmailLanguage): Promise<void> {
    const row = await userRepository.findRowByEmail(email);
    if (!row || recentlySent(row.passwordResetSentAt)) return;
    await userRepository.update(row.id, { passwordResetSentAt: new Date() });
    const token = tokenService.signPasswordReset(row.id, row.passwordHash);
    await emailService.sendPasswordReset(row.email, row.gw2Account || row.email, token, language);
  },

  /**
   * Sets a new password from the emailed link and signs the user in. The link proves access to the inbox, so it
   * also confirms the email. It works once: the new password invalidates it.
   */
  async resetPassword(token: string, password: string): Promise<AuthResponse> {
    const payload = tokenService.verifyEmailToken(token, "reset-password");
    const row = payload ? await userRepository.findRowById(payload.sub) : null;
    if (!payload || !row || !tokenService.matchesPassword(payload, row.passwordHash)) throw invalidResetLink();
    const user = await userRepository.update(row.id, {
      passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
      emailVerifiedAt: row.emailVerifiedAt ?? new Date(),
    });
    if (!user) throw invalidResetLink();
    return { token: tokenService.sign(user.id), user };
  },
};
