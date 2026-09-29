import { CLEARS_REFRESH_MS } from "../config/constants";
import { authService } from "./authService";
import { backendClient } from "./clients/backendClient";
import { logger } from "./logger";
import { stateStore } from "./stateStore";

let refreshTimer: NodeJS.Timeout | undefined;

/** Raid and strike bosses killed since the weekly reset; the backend computes them from the account's logs. */
export const clearsService = {
  async refresh(): Promise<void> {
    const credentials = authService.getCredentials();
    if (!credentials) return;
    try {
      stateStore.setClears(await backendClient.weeklyClears(credentials.apiUrl, credentials.token));
    } catch (err) {
      logger.warn("Could not load the weekly clears", err);
    }
  },

  /** Refreshes now and then every CLEARS_REFRESH_MS (also picks up kills from the website or the addon and the reset). */
  startRefreshing(): void {
    clearInterval(refreshTimer);
    void clearsService.refresh();
    refreshTimer = setInterval(() => void clearsService.refresh(), CLEARS_REFRESH_MS);
  },

  stopRefreshing(): void {
    clearInterval(refreshTimer);
  },

  clear(): void {
    stateStore.setClears(null);
  },
};
