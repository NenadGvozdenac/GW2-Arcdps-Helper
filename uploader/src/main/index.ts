import { app } from "electron";
import { join } from "node:path";
import { environment } from "./config/environment";
import { registerIpc } from "./ipc/registerIpc";
import { authService } from "./services/authService";
import { clearsService } from "./services/clearsService";
import { sessionService } from "./services/sessionService";
import { logger } from "./services/logger";
import { stateStore } from "./services/stateStore";
import { updateService } from "./services/updateService";
import { watchService } from "./services/watchService";
import { createTray } from "./tray";
import { createMainWindow, getMainWindow, markQuitting, showMainWindow } from "./window";

// Development builds keep their own settings, sign-in and history, separate from the production app.
// GW2_UPLOADER_USER_DATA overrides the profile folder entirely (useful for tests).
if (process.env.GW2_UPLOADER_USER_DATA) {
  app.setPath("userData", process.env.GW2_UPLOADER_USER_DATA);
} else if (environment.name === "development") {
  app.setPath("userData", join(app.getPath("appData"), "gw2-arcdps-helper-uploader-dev"));
} else {
  // The folder of the app's old name ("GW2 ArcDPS Helper Uploader"), so settings, sign-in and history survive the rename.
  app.setPath("userData", join(app.getPath("appData"), "GW2 ArcDPS Helper Uploader"));
}

// Only one uploader may watch the folder at a time.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", showMainWindow);

  app.whenReady().then(() => {
    // Required for Windows notifications. Windows also picks the taskbar icon by this id, and an unpackaged run
    // (`npm run dev`, electron.exe) registers a Start Menu "Electron.lnk" for it - so it must not share the installed
    // app's id, or the installed app gets the Electron icon in the taskbar.
    app.setAppUserModelId(app.isPackaged ? "com.gw2arcdpshelper.uploader" : "com.gw2arcdpshelper.uploader.dev");
    stateStore.init();
    // A session that is still running on the server (e.g. the app was restarted mid-raid) continues here.
    authService.onSignIn(() => {
      sessionService.startRefreshing();
      clearsService.startRefreshing();
    });
    authService.onSignOut(() => {
      sessionService.stopRefreshing();
      sessionService.clear();
      clearsService.stopRefreshing();
      clearsService.clear();
    });
    authService.restore();
    registerIpc(getMainWindow);
    createMainWindow();
    createTray();
    updateService.start();

    const { settings, user, logFolderExists } = stateStore.get();
    if (settings.watchOnStartup && user && logFolderExists) {
      try {
        watchService.start();
      } catch (err) {
        logger.warn("Could not start watching on startup", err);
      }
    }
    logger.info("Uploader started", { version: app.getVersion(), ...environment });
  });

  // Quit when the last window closes, unless we are watching (then the tray keeps running).
  app.on("window-all-closed", () => {
    if (!watchService.isWatching()) app.quit();
  });

  app.on("before-quit", () => {
    markQuitting();
    stateStore.flush();
  });
}
