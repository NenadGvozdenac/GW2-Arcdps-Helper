/** IPC channel names shared by main and preload. */
export const IPC = {
  getState: "state:get",
  stateChanged: "state:changed",
  login: "auth:login",
  logout: "auth:logout",
  saveSettings: "settings:save",
  chooseLogFolder: "settings:choose-log-folder",
  startWatching: "watch:start",
  stopWatching: "watch:stop",
  uploadFiles: "uploads:pick-files",
  retryUpload: "uploads:retry",
  clearFinished: "uploads:clear-finished",
  openExternal: "shell:open-external",
} as const;
