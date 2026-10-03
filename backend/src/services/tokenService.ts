import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import {
  ADMIN_CHALLENGE_EXPIRES_IN,
  ADMIN_TOKEN_EXPIRES_IN,
  EMAIL_VERIFICATION_EXPIRES_IN,
  JWT_EXPIRES_IN,
  PASSWORD_RESET_EXPIRES_IN,
} from "../config/constants";
import type {
  AdminChallengePayload,
  AdminTokenPayload,
  EmailTokenPayload,
  EmailTokenPurpose,
  TokenPayload,
} from "../types/auth.types";

/**
 * Any of our tokens, decoded: a sign-in, an email link or the admin's step-1 challenge (`purpose`), or the
 * administrator's sign-in (`role`).
 */
type AnyPayload = { sub?: unknown; purpose?: string; role?: string; pwd?: string; iat?: number };

function decode(token: string): AnyPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as AnyPayload;
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

/** Fingerprint of the administrator's credentials: changing the password or the TOTP secret signs them out. */
const adminFingerprint = (admin: { passwordHash: string; totpSecret: string }) =>
  passwordFingerprint(`${admin.passwordHash}\n${admin.totpSecret}`);

export const tokenService = {
  sign(userId: string): string {
    const payload: TokenPayload = { sub: userId };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: JWT_EXPIRES_IN, algorithm: "HS256" });
  },

  /**
   * Returns the user id and when the token was issued, or null for a missing/invalid/expired token (or a token from
   * an email link, or the administrator's).
   */
  verify(token: string): { userId: string; issuedAt: Date } | null {
    const payload = decode(token);
    if (!payload || payload.purpose || payload.role || typeof payload.sub !== "string" || typeof payload.iat !== "number") {
      return null;
    }
    return { userId: payload.sub, issuedAt: new Date(payload.iat * 1000) };
  },

  /** The administrator's sign-in (ADMIN_TOKEN_EXPIRES_IN), bound to their current credentials. */
  signAdmin(admin: { passwordHash: string; totpSecret: string }): string {
    const payload: AdminTokenPayload = { sub: "admin", role: "admin", pwd: adminFingerprint(admin) };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: ADMIN_TOKEN_EXPIRES_IN, algorithm: "HS256" });
  },

  /** Proof that the admin's email and password were right (ADMIN_CHALLENGE_EXPIRES_IN), for the code step. */
  signAdminChallenge(admin: { passwordHash: string; totpSecret: string }): string {
    const payload: AdminChallengePayload = { sub: "admin", purpose: "admin-otp", pwd: adminFingerprint(admin) };
    return jwt.sign(payload, env.jwtSecret, { expiresIn: ADMIN_CHALLENGE_EXPIRES_IN, algorithm: "HS256" });
  },

  verifyAdminChallenge(token: string, admin: { passwordHash: string; totpSecret: string }): boolean {
    const payload = decode(token);
    return payload?.purpose === "admin-otp" && payload.sub === "admin" && payload.pwd === adminFingerprint(admin);
  },

  /** True for a valid administrator token issued for the credentials configured now. */
  verifyAdmin(token: string, admin: { passwordHash: string; totpSecret: string }): boolean {
    const payload = decode(token);
    return payload?.role === "admin" && payload.sub === "admin" && payload.pwd === adminFingerprint(admin);
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
    return payload?.purpose === purpose && !payload.role && typeof payload.sub === "string"
      ? (payload as EmailTokenPayload)
      : null;
  },

  /** True when a reset token was issued for this (still current) password. */
  matchesPassword: (payload: EmailTokenPayload, passwordHash: string) =>
    payload.pwd === passwordFingerprint(passwordHash),
};
