import { Menu, Tray, app, nativeImage } from "electron";
import { mainT } from "./i18n/mainMessages";
import { logger } from "./services/logger";
import { stateStore } from "./services/stateStore";
import { watchService } from "./services/watchService";
import { iconPath, markQuitting, showMainWindow } from "./window";

let tray: Tray | null = null;

function refresh(): void {
  if (!tray) return;
  const { settings, watch, user } = stateStore.get();
  const t = mainT(settings.language);

  tray.setToolTip(`${t.appName} — ${watch.watching ? t.statusWatching : t.statusIdle}`);
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: t.trayShow, click: showMainWindow },
      { type: "separator" },
      watch.watching
        ? { label: t.trayStopWatching, click: () => watchService.stop() }
        : {
            label: t.trayStartWatching,
            enabled: !!user,
            click: () => {
              try {
                watchService.start();
              } catch (err) {
                logger.warn("Could not start watching from tray", err);
                showMainWindow();
              }
            },
          },
      { type: "separator" },
      {
        label: t.trayQuit,
        click: () => {
          markQuitting();
          app.quit();
        },
      },
    ]),
  );
}

export function createTray(): void {
  const icon = nativeImage.createFromPath(iconPath()).resize({ width: 16, height: 16 });
  tray = new Tray(icon);
  tray.on("click", showMainWindow);
  refresh();
  stateStore.subscribe(refresh);
}
