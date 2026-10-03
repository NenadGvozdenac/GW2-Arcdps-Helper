import { DASHBOARD_CHARTS_STORAGE_KEY } from "../config/constants";

// localStorage can throw (private mode, blocked storage) — treat that as "nothing stored" (charts shown).
export const dashboardChartsStorage = {
  /** Whether the dashboard's charts are collapsed in this browser. */
  getCollapsed(): boolean {
    try {
      return localStorage.getItem(DASHBOARD_CHARTS_STORAGE_KEY) === "collapsed";
    } catch {
      return false;
    }
  },
  setCollapsed(collapsed: boolean): void {
    try {
      if (collapsed) localStorage.setItem(DASHBOARD_CHARTS_STORAGE_KEY, "collapsed");
      else localStorage.removeItem(DASHBOARD_CHARTS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  },
};
