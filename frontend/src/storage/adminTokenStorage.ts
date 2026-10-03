import { ADMIN_TOKEN_STORAGE_KEY } from "../config/constants";

// localStorage like the user's sign-in: it survives closing the tab and lasts until the token expires (12 h) or
// "Sign out". It can throw (blocked storage) — treat that as "no token".
export const adminTokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
