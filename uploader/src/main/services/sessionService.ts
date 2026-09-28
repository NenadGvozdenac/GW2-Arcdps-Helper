import { SESSION_DRAIN_POLL_MS, SESSION_REFRESH_MS } from "../config/constants";
import type { UploadEntry } from "../../shared/upload.types";
import { AppError } from "../utils/appError";
import { authService } from "./authService";
import { backendClient } from "./clients/backendClient";
import { logger } from "./logger";
import { stateStore } from "./stateStore";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let refreshTimer: NodeJS.Timeout | undefined;

const isPending = (u: UploadEntry) => u.stage === "queued" || u.stage === "uploading" || u.stage === "syncing";

function requireCredentials() {
  const credentials = authService.getCredentials();
  if (!credentials) throw new AppError("NOT_SIGNED_IN", "Sign in to use sessions.");
  return credentials;
}

/** Waits until every log detected during the session has finished uploading (or failed). */
async function waitForSessionUploads(sessionId: string): Promise<void> {
  while (stateStore.get().uploads.some((u) => u.sessionId === sessionId && isPending(u))) {
    await sleep(SESSION_DRAIN_POLL_MS);
  }
}

/**
 * A session groups the logs of one sitting (e.g. a raid night). While it is active, new logs are attached to it and
 * Discord gets one summary when it ends instead of a message per log. The backend is the source of truth.
 */
export const sessionService = {
  /**
   * Syncs with the server: picks up a session that is still active (e.g. after restarting the app) and notices when
   * it ended by itself after 6 hours or was ended on the website.
   */
  async refresh(): Promise<void> {
    const credentials = authService.getCredentials();
    if (!credentials || stateStore.getSession().ending) return;
    try {
      const { session: active, resumable } = await backendClient.activeSession(credentials.apiUrl, credentials.token);
      stateStore.setSession({ active, ending: false, resumable });
    } catch (err) {
      logger.warn("Could not load the active session", err);
    }
  },

  /** Refreshes now and then every SESSION_REFRESH_MS until stopped (runs while signed in). */
  startRefreshing(): void {
    clearInterval(refreshTimer);
    void sessionService.refresh();
    refreshTimer = setInterval(() => void sessionService.refresh(), SESSION_REFRESH_MS);
  },

  stopRefreshing(): void {
    clearInterval(refreshTimer);
  },

  async start(name: string): Promise<void> {
    const { apiUrl, token } = requireCredentials();
    const active = await backendClient.startSession(apiUrl, token, name.trim());
    stateStore.setSession({ active, ending: false, resumable: null });
    logger.info("Session started", active.id);
  },

  /** Re-opens the last session when it ended automatically after 6 hours. */
  async resume(): Promise<void> {
    const { resumable } = stateStore.getSession();
    if (!resumable) return;
    const { apiUrl, token } = requireCredentials();
    const active = await backendClient.resumeSession(apiUrl, token, resumable.id);
    stateStore.setSession({ active, ending: false, resumable: null });
    logger.info("Session resumed", active.id);
  },

  /** Renames the active session (an empty name falls back to "Session" in the UI). */
  async rename(name: string): Promise<void> {
    const { active } = stateStore.getSession();
    if (!active) return;
    const { apiUrl, token } = requireCredentials();
    const renamed = await backendClient.renameSession(apiUrl, token, active.id, name.trim());
    // Ending may have started meanwhile; keep that state and only take the new name.
    const current = stateStore.getSession();
    if (current.active?.id === renamed.id) stateStore.setSession({ ...current, active: { ...current.active, name: renamed.name } });
  },

  /** Ends the session once its pending uploads are done, so the Discord summary contains all of them. */
  async end(): Promise<void> {
    const { active, ending } = stateStore.getSession();
    if (!active || ending) return;
    stateStore.setSession({ active, ending: true, resumable: null });
    try {
      await waitForSessionUploads(active.id);
      const { apiUrl, token } = requireCredentials();
      await backendClient.endSession(apiUrl, token, active.id);
      stateStore.setSession({ active: null, ending: false, resumable: null });
      logger.info("Session ended", active.id);
    } catch (err) {
      // Deleted on the website in the meantime: there is nothing left to end.
      if (err instanceof AppError && err.code === "SESSION_NOT_FOUND") return sessionService.clear();
      stateStore.setSession({ active, ending: false, resumable: null });
      throw err;
    }
  },

  clear(): void {
    stateStore.setSession({ active: null, ending: false, resumable: null });
  },
};
