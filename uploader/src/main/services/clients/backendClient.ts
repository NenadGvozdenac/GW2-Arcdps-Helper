import { BACKEND_TIMEOUT_MS } from "../../config/constants";
import type {
  AuthResponse,
  BackendErrorBody,
  BackendSubmitResult,
  BackendUser,
} from "../../../shared/backend.types";
import { AppError, fetchWithTimeout } from "../../utils/appError";

const trimSlash = (url: string) => url.replace(/\/+$/, "");

async function request<T>(apiUrl: string, path: string, init: RequestInit & { token?: string } = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (init.body) headers["Content-Type"] = "application/json";
  if (init.token) headers.Authorization = `Bearer ${init.token}`;

  const res = await fetchWithTimeout(`${trimSlash(apiUrl)}${path}`, { ...init, headers }, BACKEND_TIMEOUT_MS);
  const body = (await res.json().catch(() => ({}))) as T & BackendErrorBody;
  if (!res.ok) {
    throw new AppError(body.code ?? "BACKEND_ERROR", body.error ?? `GW2 ArcDPS Helper returned ${res.status}`, res.status);
  }
  return body;
}

/** Talks to the GW2 ArcDPS Helper backend (the same API the web app uses). */
export const backendClient = {
  login: (apiUrl: string, email: string, password: string) =>
    request<AuthResponse>(apiUrl, "/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  async me(apiUrl: string, token: string): Promise<BackendUser> {
    return (await request<{ user: BackendUser }>(apiUrl, "/auth/me", { token })).user;
  },

  async submitLogs(apiUrl: string, token: string, urls: string[]): Promise<BackendSubmitResult[]> {
    const body = await request<{ results: BackendSubmitResult[] }>(apiUrl, "/logs", {
      method: "POST",
      token,
      body: JSON.stringify({ urls }),
    });
    return body.results;
  },
};
