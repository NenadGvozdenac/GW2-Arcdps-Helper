/** Error with a machine-readable code that is sent to the renderer and translated there. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export function toIpcError(err: unknown): { code: string; message: string } {
  if (err instanceof AppError) return { code: err.code, message: err.message };
  return { code: "UNKNOWN", message: err instanceof Error ? err.message : String(err) };
}

/** fetch() with a timeout; network failures become AppError("NETWORK_ERROR"). */
export async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new AppError("NETWORK_ERROR", `Request to ${new URL(url).host} failed: ${reason}`);
  }
}
