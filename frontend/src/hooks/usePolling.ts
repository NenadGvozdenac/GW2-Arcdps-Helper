import { useEffect } from "react";
import { POLL_INTERVAL_MS } from "../config/constants";

const isTabVisible = () => document.visibilityState === "visible";

/**
 * Calls `refresh` every POLL_INTERVAL_MS while the tab is visible, and right away when it becomes visible again.
 * Does nothing while `enabled` is false.
 */
export function usePolling(refresh: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (isTabVisible()) refresh();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (isTabVisible()) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh, enabled]);
}
