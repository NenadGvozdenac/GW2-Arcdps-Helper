import { Notification } from "electron";
import type { UploadEntry } from "../../shared/upload.types";
import { mainT } from "../i18n/mainMessages";
import { stateStore } from "./stateStore";

/** Windows toast for finished uploads, if enabled in settings. */
export const notifier = {
  uploadFinished(entry: UploadEntry): void {
    const { desktopNotifications, language } = stateStore.getSettings();
    // No notification for failed uploads.
    if (!desktopNotifications || !Notification.isSupported() || entry.stage !== "done") return;

    const t = mainT(language);
    const title = `${entry.bossName ?? entry.fileName} — ${entry.success ? t.kill : t.wipe}`;
    new Notification({ title, body: t.syncedToWeb, silent: true }).show();
  },

  info(title: string, body: string): void {
    if (Notification.isSupported()) new Notification({ title, body, silent: true }).show();
  },
};
