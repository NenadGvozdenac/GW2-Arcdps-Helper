import type { Language } from "../i18n/languages";
import type { User } from "./user.types";

export interface TokenPayload {
  sub: string; // user id
}

export type EmailTokenPurpose = "verify-email" | "reset-password";

/** Payload of a link sent by email; `purpose` keeps it from being usable as a sign-in token. */
export interface EmailTokenPayload {
  sub: string; // user id
  purpose: EmailTokenPurpose;
  /** reset-password only: fingerprint of the current password hash, so the link stops working once it is used. */
  pwd?: string;
}

/** Language of the emails we send; the list lives in src/i18n/languages.ts. */
export type EmailLanguage = Language;

export interface RegisterResponse {
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterInput {
  email: string;
  password: string;
  gw2Account: string;
  language: EmailLanguage;
  acceptTerms: true;
}

export interface LoginInput {
  email: string;
  password: string;
}

/** `res.locals` of requests that passed the requireAuth middleware. */
export interface AuthLocals {
  userId: string;
}
