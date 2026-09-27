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
export const emailTaken = () => new HttpError(409, "EMAIL_TAKEN", "An account with this email already exists.");
export const userNotFound = () => new HttpError(404, "USER_NOT_FOUND", "User not found.");
export const logNotFound = () => new HttpError(404, "LOG_NOT_FOUND", "Log not found.");
export const invalidLogFile = () =>
  new HttpError(400, "INVALID_LOG_FILE", "Send one ArcDPS log file (.zevtc, .evtc or .zip) in the \"file\" field.");
export const fileTooLarge = () => new HttpError(413, "FILE_TOO_LARGE", "The log file is too large.");
export const discordWebhookFailed = () =>
  new HttpError(502, "DISCORD_WEBHOOK_FAILED", "Discord did not accept the message. Check the webhook URL.");
