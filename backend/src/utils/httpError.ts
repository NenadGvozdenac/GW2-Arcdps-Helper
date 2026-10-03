import type { ErrorCode } from "../types/error.types";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const validationError = (message: string) => new HttpError(400, "VALIDATION_ERROR", message);
export const unauthenticated = () => new HttpError(401, "UNAUTHENTICATED", "You must be signed in.");
export const invalidCredentials = () => new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
export const accountBlocked = () =>
  new HttpError(403, "ACCOUNT_BLOCKED", "This account has been blocked. Contact us through the feedback page.");
export const ipBlocked = () => new HttpError(403, "IP_BLOCKED", "Requests from your network have been blocked.");
export const adminDisabled = () => new HttpError(404, "ADMIN_DISABLED", "The admin area is not set up on this server.");
export const webhookNotFound = () => new HttpError(404, "WEBHOOK_NOT_FOUND", "Webhook not found.");
export const tooManyLoginAttempts = () =>
  new HttpError(
    429,
    "TOO_MANY_LOGIN_ATTEMPTS",
    "Too many wrong passwords. Try again in 15 minutes or reset your password.",
  );
/** 403, not 401: the user is signed in, only the password they typed to confirm an action is wrong. */
export const wrongPassword = () => new HttpError(403, "WRONG_PASSWORD", "The password is not correct.");
export const appLoginNotFound = () =>
  new HttpError(404, "APP_LOGIN_NOT_FOUND", "This sign-in request has expired or was already used.");
export const emailTaken = () => new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");
export const emailNotVerified = () =>
  new HttpError(403, "EMAIL_NOT_VERIFIED", "Confirm your email address first - check your inbox.");
export const invalidVerificationLink = () =>
  new HttpError(400, "INVALID_VERIFICATION_LINK", "This confirmation link is invalid or has expired.");
export const invalidResetLink = () =>
  new HttpError(400, "INVALID_RESET_LINK", "This password reset link is invalid, expired or already used.");
export const emailSendFailed = () =>
  new HttpError(502, "EMAIL_SEND_FAILED", "The email could not be sent. Try again later.");
export const userNotFound = () => new HttpError(404, "USER_NOT_FOUND", "User not found.");
export const logNotFound = () => new HttpError(404, "LOG_NOT_FOUND", "Log not found.");
export const sessionNotFound = () => new HttpError(404, "SESSION_NOT_FOUND", "Session not found.");
export const sessionNotResumable = () =>
  new HttpError(409, "SESSION_NOT_RESUMABLE", "Only a session that ended automatically after 6 hours can be resumed.");
export const invalidLogFile = () =>
  new HttpError(400, "INVALID_LOG_FILE", "Send one ArcDPS log file (.zevtc, .evtc or .zip) in the \"file\" field.");
export const feedbackTooSoon = () =>
  new HttpError(429, "FEEDBACK_TOO_SOON", "You just sent feedback. Wait a minute before sending more.");
export const fileTooLarge = () => new HttpError(413, "FILE_TOO_LARGE", "The log file is too large.");
export const discordTestTooSoon = () =>
  new HttpError(429, "DISCORD_TEST_TOO_SOON", "Too many test messages. Wait a few minutes before sending another.");
export const discordWebhookFailed = () =>
  new HttpError(502, "DISCORD_WEBHOOK_FAILED", "Discord did not accept the message. Check the webhook URL.");
