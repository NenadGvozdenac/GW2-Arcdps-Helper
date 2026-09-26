import { existsSync } from "node:fs";
import { AppError } from "../utils/appError";
import { authService } from "./authService";
import { FolderWatcher } from "./folderWatcher";
import { logger } from "./logger";
import { stateStore } from "./stateStore";
import { uploadService } from "./uploadService";

const watcher = new FolderWatcher();

export const watchService = {
  start(): void {
    if (!authService.getCredentials()) throw new AppError("NOT_SIGNED_IN", "Sign in first.");
    const { logFolder } = stateStore.getSettings();
    if (!logFolder || !existsSync(logFolder)) throw new AppError("LOG_FOLDER_MISSING", "The log folder does not exist.");

    watcher.start(logFolder, (filePath) => uploadService.enqueue(filePath));
    stateStore.setWatch({ watching: true, startedAt: new Date().toISOString() });
  },

  stop(): void {
    watcher.stop();
    stateStore.setWatch({ watching: false, startedAt: null });
    logger.info("Stopped watching");
  },

  /** Re-applies a changed log folder while watching. */
  restartIfWatching(): void {
    if (!stateStore.getWatch().watching) return;
    try {
      watchService.start();
    } catch (err) {
      logger.warn("Could not restart watcher", err);
      watchService.stop();
    }
  },

  isWatching: () => stateStore.getWatch().watching,
};

authService.onSignOut(() => watchService.stop());
