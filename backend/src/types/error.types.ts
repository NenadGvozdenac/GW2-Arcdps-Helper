/** Machine-readable error codes. The frontend translates these; `message` is an English fallback. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "WRONG_PASSWORD"
  | "APP_LOGIN_NOT_FOUND"
  | "EMAIL_TAKEN"
  | "EMAIL_NOT_VERIFIED"
  | "INVALID_VERIFICATION_LINK"
  | "INVALID_RESET_LINK"
  | "EMAIL_SEND_FAILED"
  | "USER_NOT_FOUND"
  | "LOG_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_RESUMABLE"
  | "DISCORD_WEBHOOK_FAILED"
  | "INVALID_LOG_FILE"
  | "FILE_TOO_LARGE"
  | "FEEDBACK_TOO_SOON"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
}
