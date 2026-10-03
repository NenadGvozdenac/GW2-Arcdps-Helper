import { API_BASE_URL } from "../config/constants";
import { ApiError, type ApiErrorBody } from "../domain/types/api.types";
import { adminTokenStorage } from "../storage/adminTokenStorage";
import { tokenStorage } from "../storage/tokenStorage";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/** A JSON client that signs its requests with the token `getToken` returns (if any). */
function createHttp(getToken: () => string | null) {
  async function request<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    // FormData (file uploads) sets its own multipart Content-Type with the boundary.
    const isForm = body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: isForm ? body : body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, "NETWORK_ERROR", "Server is unreachable.");
    }

    if (res.status === 204) return undefined as T;
    // Also raised by the hosting platform itself (Vercel rejects bodies over ~4.5 MB without our JSON error body).
    if (res.status === 413) throw new ApiError(413, "FILE_TOO_LARGE", "Request body too large.");
    const data = (await res.json().catch(() => ({}))) as T & ApiErrorBody;
    if (!res.ok) throw new ApiError(res.status, data.code ?? "INTERNAL_ERROR", data.error ?? `Request failed with ${res.status}`);
    return data;
  }

  return {
    get: <T>(path: string) => request<T>("GET", path),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
    put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
    patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
    delete: (path: string) => request<void>("DELETE", path),
    /** DELETE with a JSON body (e.g. a password confirming the action). */
    deleteWithBody: (path: string, body: unknown) => request<void>("DELETE", path, body),
    /** DELETE that returns a JSON body. */
    deleteJson: <T>(path: string) => request<T>("DELETE", path),
  };
}

export const http = createHttp(tokenStorage.get);
/** The admin area's requests, signed with the administrator's token (never the user's). */
export const adminHttp = createHttp(adminTokenStorage.get);
