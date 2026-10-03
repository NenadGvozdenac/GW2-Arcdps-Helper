import { ADMIN_TOKEN_STORAGE_KEY } from "../config/constants";

// sessionStorage: the admin sign-in ends with the tab. It can throw (blocked storage) — treat that as "no token".
export const adminTokenStorage = {
  get(): string | null {
    try {
      return sessionStorage.getItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  set(token: string): void {
    try {
      sessionStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, token);
    } catch {
      /* ignore */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
