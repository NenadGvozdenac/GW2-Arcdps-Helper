/** Machine-readable error codes. The frontend translates these; `message` is an English fallback. */
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "EMAIL_TAKEN"
  | "USER_NOT_FOUND"
  | "LOG_NOT_FOUND"
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR";

export interface ErrorResponse {
  error: string;
  code: ErrorCode;
}
