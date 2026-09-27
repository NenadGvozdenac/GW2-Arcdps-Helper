import { BrowserWindow, dialog, ipcMain, shell } from "electron";
import { IPC } from "../../shared/ipc";
import type { IpcResult, LoginRequest } from "../../shared/app.types";
import type { Settings } from "../../shared/settings.types";
import { mainT } from "../i18n/mainMessages";
import { authService } from "../services/authService";
import { isLogFile } from "../services/folderWatcher";
import { sessionService } from "../services/sessionService";
import { settingsService } from "../services/settingsService";
import { stateStore } from "../services/stateStore";
import { uploadService } from "../services/uploadService";
import { watchService } from "../services/watchService";
import { toIpcError } from "../utils/appError";

/** Runs an action and converts thrown errors into an IpcResult the renderer can translate. */
async function result<T = void>(action: () => T | Promise<T>): Promise<IpcResult<T>> {
  try {
    return { ok: true, value: await action() };
  } catch (err) {
    return { ok: false, error: toIpcError(err) };
  }
}

export function registerIpc(getWindow: () => BrowserWindow | null): void {
  stateStore.subscribe((state) => getWindow()?.webContents.send(IPC.stateChanged, state));

  ipcMain.handle(IPC.getState, () => stateStore.get());

  ipcMain.handle(IPC.login, (_e, req: LoginRequest) => result(() => authService.login(req)));
  ipcMain.handle(IPC.logout, () => authService.logout());

  ipcMain.handle(IPC.saveSettings, (_e, patch: Partial<Settings>) => result(() => settingsService.save(patch)));

  ipcMain.handle(IPC.chooseLogFolder, async () => {
    const win = getWindow();
    const t = mainT(stateStore.getSettings().language);
    const options = {
      title: t.chooseFolderTitle,
      defaultPath: stateStore.getSettings().logFolder || undefined,
      properties: ["openDirectory" as const],
    };
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    return res.canceled ? null : (res.filePaths[0] ?? null);
  });

  ipcMain.handle(IPC.startWatching, () => result(() => watchService.start()));
  ipcMain.handle(IPC.stopWatching, () => watchService.stop());

  ipcMain.handle(IPC.startSession, (_e, name: string) => result(() => sessionService.start(String(name ?? ""))));
  ipcMain.handle(IPC.endSession, () => result(() => sessionService.end()));
  ipcMain.handle(IPC.resumeSession, () => result(() => sessionService.resume()));

  ipcMain.handle(IPC.uploadFiles, async () => {
    const win = getWindow();
    const t = mainT(stateStore.getSettings().language);
    const options = {
      title: t.chooseFilesTitle,
      defaultPath: stateStore.getSettings().logFolder || undefined,
      properties: ["openFile" as const, "multiSelections" as const],
      filters: [{ name: t.logFilesFilter, extensions: ["zevtc", "evtc", "zip"] }],
    };
    const res = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (res.canceled) return;
    for (const file of res.filePaths.filter(isLogFile)) uploadService.enqueue(file, false);
  });

  ipcMain.handle(IPC.retryUpload, (_e, id: string) => uploadService.retry(id));
  ipcMain.handle(IPC.clearFinished, () => uploadService.clearFinished());

  // Only http(s) links leave the app; everything else is ignored.
  ipcMain.handle(IPC.openExternal, (_e, url: string) => {
    if (/^https?:\/\//i.test(url)) return shell.openExternal(url);
  });
}
