// The few strings shown by the main process (tray menu, notifications, dialogs); source of truth for the keys.
// Everything inside the window is translated in the renderer (src/renderer/src/i18n).
export const en = {
  appName: "GW2 ArcDPS Helper Uploader",
  trayShow: "Open GW2 ArcDPS Helper Uploader",
  trayStartWatching: "Start watching",
  trayStopWatching: "Stop watching",
  trayQuit: "Quit",
  statusWatching: "Watching for new logs",
  statusIdle: "Not watching",
  stillRunning: "Still running in the tray and uploading new logs.",
  kill: "Kill",
  wipe: "Wipe",
  syncedToWeb: "Uploaded to dps.report and saved to GW2 ArcDPS Helper.",
  uploadFailed: "Log upload failed",
  chooseFolderTitle: "Choose your ArcDPS log folder (arcdps.cbtlogs)",
  chooseFilesTitle: "Choose ArcDPS logs to upload",
  logFilesFilter: "ArcDPS logs",
  updateReadyTitle: "Version {version} is ready",
  updateReadyBody: "It is installed when you restart the app (or use “Restart and update”).",
};

export type MainMessages = typeof en;
