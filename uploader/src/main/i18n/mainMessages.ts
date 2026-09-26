import type { Language } from "../../shared/settings.types";

// The few strings shown by the main process (tray menu, notifications, dialogs).
// Everything inside the window is translated in the renderer (src/renderer/src/i18n).
const en = {
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
};

const sr: typeof en = {
  appName: "GW2 ArcDPS Helper Uploader",
  trayShow: "Otvori GW2 ArcDPS Helper Uploader",
  trayStartWatching: "Pokreni praćenje",
  trayStopWatching: "Zaustavi praćenje",
  trayQuit: "Izađi",
  statusWatching: "Prati nove logove",
  statusIdle: "Praćenje je zaustavljeno",
  stillRunning: "Aplikacija i dalje radi u tray-u i uploaduje nove logove.",
  kill: "Kill",
  wipe: "Wipe",
  syncedToWeb: "Uploadovano na dps.report i sačuvano na GW2 ArcDPS Helper.",
  uploadFailed: "Upload loga nije uspeo",
  chooseFolderTitle: "Izaberi ArcDPS folder sa logovima (arcdps.cbtlogs)",
  chooseFilesTitle: "Izaberi ArcDPS logove za upload",
  logFilesFilter: "ArcDPS logovi",
};

export type MainMessages = typeof en;

export const mainT = (lang: Language): MainMessages => (lang === "sr" ? sr : en);
