import type { AppEnvironment } from "../../shared/environment.types";

const trimSlash = (url: string) => (url ?? "").trim().replace(/\/+$/, "");

export const environment: AppEnvironment = {
  name: import.meta.env.MODE === "production" ? "production" : "development",
  apiUrl: trimSlash(import.meta.env.MAIN_VITE_API_URL),
  webUrl: trimSlash(import.meta.env.MAIN_VITE_WEB_URL),
};

if (!environment.apiUrl || !environment.webUrl) {
  throw new Error(`MAIN_VITE_API_URL / MAIN_VITE_WEB_URL are not set for mode "${import.meta.env.MODE}"`);
}
