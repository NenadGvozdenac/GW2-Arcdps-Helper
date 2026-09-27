/** Machine-readable error codes. The frontend translates these; `message` is an English fallback. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "USER_NOT_FOUND"
  | "LOG_NOT_FOUND"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_RESUMABLE"
  | "DISCORD_WEBHOOK_FAILED"
  | "INVALID_LOG_FILE"
  | "FILE_TOO_LARGE"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
}
