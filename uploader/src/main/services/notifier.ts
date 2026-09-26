import { Notification } from "electron";
import type { UploadEntry } from "../../shared/upload.types";
import { mainT } from "../i18n/mainMessages";
import { stateStore } from "./stateStore";

/** Windows toast for finished/failed uploads, if enabled in settings. */
export const notifier = {
  uploadFinished(entry: UploadEntry): void {
    const { desktopNotifications, language } = stateStore.getSettings();
    if (!desktopNotifications || !Notification.isSupported()) return;

    const t = mainT(language);
    const title =
      entry.stage === "done"
        ? `${entry.bossName ?? entry.fileName} — ${entry.success ? t.kill : t.wipe}${entry.isCM ? " (CM)" : ""}`
        : t.uploadFailed;
    const body = entry.stage === "done" ? t.syncedToWeb : `${entry.fileName}: ${entry.errorDetail ?? ""}`;
    new Notification({ title, body, silent: true }).show();
  },

  info(title: string, body: string): void {
    if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
  },
};
