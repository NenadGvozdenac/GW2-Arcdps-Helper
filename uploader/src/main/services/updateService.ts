import { app } from "electron";
import { autoUpdater } from "electron-updater";
import {
  RELEASES_API_URL,
  RELEASES_DOWNLOAD_URL,
  UPDATE_CHECK_INTERVAL_MS,
  UPDATE_FIRST_CHECK_MS,
} from "../config/constants";
import { mainT } from "../i18n/mainMessages";
import { fetchWithTimeout } from "../utils/appError";
import { logger } from "./logger";
import { notifier } from "./notifier";
import { stateStore } from "./stateStore";

/** Subset of GET /repos/{owner}/{repo}/releases (newest first). */
interface GithubRelease {
  tag_name: string;
  draft: boolean;
  prerelease: boolean;
  html_url: string;
  assets: { name: string }[];
}

interface LatestRelease {
  version: string;
  tag: string;
  pageUrl: string;
}

const TAG = /^uploader-v(\d+\.\d+\.\d+)$/;

/** The portable exe (electron-builder "portable" target) can't update itself. */
const isPortable = () => !!process.env.PORTABLE_EXECUTABLE_FILE;

/** Numeric X.Y.Z comparison: > 0 when a is newer. */
function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
}

/** Newest published uploader release that electron-updater can install from (it needs the release's latest.yml). */
async function latestRelease(): Promise<LatestRelease | null> {
  const res = await fetchWithTimeout(RELEASES_API_URL, { headers: { Accept: "application/vnd.github+json" } }, 30_000);
  if (!res.ok) throw new Error(`GitHub returned ${res.status}`);
  const releases = (await res.json()) as GithubRelease[];
  for (const r of releases) {
    const version = TAG.exec(r.tag_name)?.[1];
    if (!version || r.draft || r.prerelease) continue;
    if (!isPortable() && !r.assets.some((a) => a.name === "latest.yml")) continue;
    return { version, tag: r.tag_name, pageUrl: r.html_url };
  }
  return null;
}

async function check(): Promise<void> {
  const { status } = stateStore.getUpdate();
  if (status === "downloading" || status === "ready") return;
  try {
    const latest = await latestRelease();
    if (!latest || compareVersions(latest.version, app.getVersion()) <= 0) {
      return logger.info("Up to date", { current: app.getVersion(), latest: latest?.version ?? null });
    }
    logger.info("Update available", { current: app.getVersion(), latest: latest.version });

    if (isPortable()) {
      stateStore.setUpdate({ status: "available", version: latest.version, progress: null, downloadUrl: latest.pageUrl });
      return;
    }
    // electron-updater reads latest.yml from that release, downloads the installer and checks its sha512.
    autoUpdater.setFeedURL({ provider: "generic", url: `${RELEASES_DOWNLOAD_URL}/${latest.tag}` });
    stateStore.setUpdate({ status: "downloading", version: latest.version, progress: 0, downloadUrl: null });
    await autoUpdater.checkForUpdates();
  } catch (err) {
    // Offline or GitHub rate-limited: try again at the next check.
    logger.warn("Update check failed", err);
    if (stateStore.getUpdate().status === "downloading") {
      stateStore.setUpdate({ status: "idle", version: null, progress: null, downloadUrl: null });
    }
  }
}

export const updateService = {
  /** Checks shortly after start-up, then every UPDATE_CHECK_INTERVAL_MS. Only in the installed (packaged) app. */
  start(): void {
    if (!app.isPackaged) return;

    autoUpdater.logger = logger;
    autoUpdater.autoDownload = true;
    // Installs silently when the app quits, if the user never pressed "Restart and update".
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("download-progress", (p) => {
      const update = stateStore.getUpdate();
      if (update.status === "downloading") stateStore.setUpdate({ ...update, progress: Math.round(p.percent) });
    });
    autoUpdater.on("update-downloaded", (info) => {
      logger.info("Update downloaded", info.version);
      stateStore.setUpdate({ status: "ready", version: info.version, progress: 100, downloadUrl: null });
      const t = mainT(stateStore.getSettings().language);
      notifier.info(t.updateReadyTitle.replace("{version}", info.version), t.updateReadyBody);
    });
    autoUpdater.on("error", (err) => {
      logger.warn("Updater error", err);
      if (stateStore.getUpdate().status === "downloading") {
        stateStore.setUpdate({ status: "idle", version: null, progress: null, downloadUrl: null });
      }
    });

    setTimeout(() => void check(), UPDATE_FIRST_CHECK_MS);
    setInterval(() => void check(), UPDATE_CHECK_INTERVAL_MS);
  },

  /** Quits and runs the downloaded installer silently; the app starts again afterwards. */
  install(): void {
    if (stateStore.getUpdate().status !== "ready") return;
    logger.info("Installing update", stateStore.getUpdate().version);
    autoUpdater.quitAndInstall(true, true);
  },
};
