import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import { IPC } from "../shared/ipc";
import type { AppState, UploaderApi } from "../shared/app.types";

// The only bridge between the sandboxed renderer and the main process.
const api: UploaderApi = {
  getState: () => ipcRenderer.invoke(IPC.getState),
  onStateChanged(listener) {
    const handler = (_e: IpcRendererEvent, state: AppState) => listener(state);
    ipcRenderer.on(IPC.stateChanged, handler);
    return () => ipcRenderer.removeListener(IPC.stateChanged, handler);
  },

  login: (req) => ipcRenderer.invoke(IPC.login, req),
  logout: () => ipcRenderer.invoke(IPC.logout),

  saveSettings: (patch) => ipcRenderer.invoke(IPC.saveSettings, patch),
  chooseLogFolder: () => ipcRenderer.invoke(IPC.chooseLogFolder),

  startWatching: () => ipcRenderer.invoke(IPC.startWatching),
  stopWatching: () => ipcRenderer.invoke(IPC.stopWatching),

  startSession: (name) => ipcRenderer.invoke(IPC.startSession, name),
  endSession: () => ipcRenderer.invoke(IPC.endSession),
  resumeSession: () => ipcRenderer.invoke(IPC.resumeSession),

  uploadFiles: () => ipcRenderer.invoke(IPC.uploadFiles),
  retryUpload: (id) => ipcRenderer.invoke(IPC.retryUpload, id),
  clearFinished: () => ipcRenderer.invoke(IPC.clearFinished),
  openExternal: (url) => ipcRenderer.invoke(IPC.openExternal, url),

  installUpdate: () => ipcRenderer.invoke(IPC.installUpdate),
};

contextBridge.exposeInMainWorld("uploader", api);
