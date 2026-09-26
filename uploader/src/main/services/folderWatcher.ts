import { watch, type FSWatcher } from "node:fs";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { FILE_STABLE_MS, FILE_WAIT_TIMEOUT_MS, LOG_EXTENSIONS } from "../config/constants";
import { logger } from "./logger";

export const isLogFile = (path: string) => LOG_EXTENSIONS.some((ext) => path.toLowerCase().endsWith(ext));

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves once the file size stops changing (ArcDPS finished writing). Rejects on timeout or if it vanishes. */
export async function waitUntilWritten(filePath: string): Promise<void> {
  const deadline = Date.now() + FILE_WAIT_TIMEOUT_MS;
  let lastSize = -1;
  let stableSince = 0;
  while (Date.now() < deadline) {
    const { size } = await stat(filePath);
    if (size > 0 && size === lastSize) {
      if (Date.now() - stableSince >= FILE_STABLE_MS) return;
    } else {
      lastSize = size;
      stableSince = Date.now();
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for ${filePath} to finish writing`);
}

/** Watches a folder (recursively — ArcDPS uses one sub-folder per boss) for new log files. */
export class FolderWatcher {
  private watcher: FSWatcher | null = null;
  private readonly seen = new Set<string>();

  start(folder: string, onNewFile: (filePath: string) => void): void {
    this.stop();
    this.watcher = watch(folder, { recursive: true }, (_event, fileName) => {
      if (!fileName || !isLogFile(fileName)) return;
      const fullPath = join(folder, fileName.toString());
      if (this.seen.has(fullPath)) return;
      // "rename" also fires for deletions; only react to files that exist.
      stat(fullPath)
        .then((s) => {
          if (!s.isFile() || this.seen.has(fullPath)) return;
          this.seen.add(fullPath);
          logger.info("New log file detected", fullPath);
          onNewFile(fullPath);
        })
        .catch(() => undefined);
    });
    this.watcher.on("error", (err) => logger.error("Folder watcher error", err));
    logger.info("Watching folder", folder);
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = null;
    this.seen.clear();
  }

  get isRunning(): boolean {
    return this.watcher !== null;
  }
}
