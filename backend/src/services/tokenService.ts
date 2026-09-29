import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { EMAIL_VERIFICATION_EXPIRES_IN, JWT_EXPIRES_IN, PASSWORD_RESET_EXPIRES_IN } from "../config/constants";
import type { EmailTokenPayload, EmailTokenPurpose, TokenPayload } from "../types/auth.types";

function decode(token: string): Partial<EmailTokenPayload> | null {
  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as Partial<EmailTokenPayload>;
  } catch {
    return null;
  }
}

function signEmailToken(payload: EmailTokenPayload, expiresIn: "24h" | "1h"): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn, algorithm: "HS256" });
}

/** Short fingerprint of a password hash: changes whenever the password does. */
const passwordFingerprint = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("base64url").slice(0, 16);

export const tokenService = {
  sign(userId: string): string {
    const payload: TokenPayload = { sub: userId };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" });
  },

  /** Returns the user id, or null for a missing/invalid/expired token (or a token from an email link). */
  verify(token: string): string | null {
    const payload = decode(token);
    return payload && !payload.purpose && typeof payload.sub === "string" ? payload.sub : null;
  },

  /** Token for the link in the confirmation email. */
  signEmailVerification(userId: string): string {
    return signEmailToken({ sub: userId, purpose: "verify-email" }, EMAIL_VERIFICATION_EXPIRES_IN);
  },

  /** Token for the link in the password-reset email; it stops working once the password changes. */
  signPasswordReset(userId: string, passwordHash: string): string {
    return signEmailToken(
      { sub: userId, purpose: "reset-password", pwd: passwordFingerprint(passwordHash) },
      PASSWORD_RESET_EXPIRES_IN,
    );
  },

  /** Returns the payload of a valid, unexpired email-link token with this purpose, otherwise null. */
  verifyEmailToken(token: string, purpose: EmailTokenPurpose): EmailTokenPayload | null {
    const payload = decode(token);
    return payload?.purpose === purpose && typeof payload.sub === "string" ? (payload as EmailTokenPayload) : null;
  },

  /** True when a reset token was issued for this (still current) password. */
  matchesPassword: (payload: EmailTokenPayload, passwordHash: string) =>
    payload.pwd === passwordFingerprint(passwordHash),
};
