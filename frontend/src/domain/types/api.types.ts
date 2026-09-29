/** Error codes returned by the backend (see backend/src/types/error.types.ts), plus client-side NETWORK_ERROR. */
export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "INVALID_JSON"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
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
  | "ROUTE_NOT_FOUND"
  | "INTERNAL_ERROR"
  | "NETWORK_ERROR";

/** Error thrown by the HTTP client for failed requests. `message` is the server's English text. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface ApiErrorBody {
  error?: string;
  code?: ApiErrorCode;
}
