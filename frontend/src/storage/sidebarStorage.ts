import { SIDEBAR_STORAGE_KEY } from "../config/constants";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored" (sidebar expanded).
export const sidebarStorage = {
  /** Whether the app's sidebar is collapsed to icons in this browser. */
  getCollapsed(): boolean {
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed";
    } catch {
      return false;
    }
  },
  setCollapsed(collapsed: boolean): void {
    try {
      if (collapsed) localStorage.setItem(SIDEBAR_STORAGE_KEY, "collapsed");
      else localStorage.removeItem(SIDEBAR_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
