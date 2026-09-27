import { SETUP_TIP_DISMISSED_STORAGE_KEY } from "../config/constants";

const key = (userId: string) => `${SETUP_TIP_DISMISSED_STORAGE_KEY}.${userId}`;

// localStorage can throw (private mode, blocked storage) — treat that as "not dismissed".
export const setupTipStorage = {
  isDismissed(userId: string): boolean {
    try {
      return localStorage.getItem(key(userId)) === "1";
    } catch {
      return false;
    }
  },
  dismiss(userId: string): void {
    try {
      localStorage.setItem(key(userId), "1");
    } catch {
      /* ignore */
    }
  },
};
