import { BrowserWindow, app, shell } from "electron";
import { join } from "node:path";
import { mainT } from "./i18n/mainMessages";
import { notifier } from "./services/notifier";
import { stateStore } from "./services/stateStore";

let mainWindow: BrowserWindow | null = null;
let quitting = false;
let trayHintShown = false;

export const iconPath = () => join(app.getAppPath(), "resources", "icon.png");

export function markQuitting(): void {
  quitting = true;
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function showMainWindow(): void {
  if (!mainWindow) return createMainWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

export function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 820,
    minHeight: 600,
    show: false,
    backgroundColor: "#0f1115",
    autoHideMenuBar: true,
    icon: iconPath(),
    title: "GW2 ArcDPS Helper",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());

  // Links never open inside the app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });

  // While watching, closing the window keeps the app running in the tray.
  mainWindow.on("close", (e) => {
    if (quitting || !stateStore.getWatch().watching) return;
    e.preventDefault();
    mainWindow?.hide();
    if (!trayHintShown) {
      const t = mainT(stateStore.getSettings().language);
      notifier.info(t.appName, t.stillRunning);
      trayHintShown = true;
    }
  });
  mainWindow.on("closed", () => (mainWindow = null));

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}
