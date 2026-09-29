import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import { DPS_REPORT_ATTEMPTS } from "../config/constants";
import type { UploadEntry } from "../../shared/upload.types";
import { AppError } from "../utils/appError";
import { authService } from "./authService";
import { clearsService } from "./clearsService";
import { backendClient } from "./clients/backendClient";
import { dpsReportClient } from "./clients/dpsReportClient";
import { waitUntilWritten } from "./folderWatcher";
import { logger } from "./logger";
import { notifier } from "./notifier";
import { stateStore } from "./stateStore";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function newEntry(filePath: string): UploadEntry {
  return {
    id: randomUUID(),
    filePath,
    fileName: basename(filePath),
    detectedAt: new Date().toISOString(),
    stage: "queued",
    errorCode: null,
    errorDetail: null,
    permalink: null,
    bossName: null,
    success: null,
    isCM: false,
    isLegendaryCM: false,
    durationMs: null,
    encounterStart: null,
    webLogId: null,
    encounterKey: null,
    groupName: null,
    sessionId: stateStore.getSession().active?.id ?? null,
  };
}

/** Retries network failures and 5xx; dps.report's own rejections (e.g. "log too short") are final. */
const isRetryable = (err: unknown) =>
  err instanceof AppError && (err.code === "NETWORK_ERROR" || (err.status !== undefined && err.status >= 500));

async function uploadToDpsReport(entry: UploadEntry): Promise<void> {
  stateStore.updateUpload(entry.id, { stage: "uploading", errorCode: null, errorDetail: null });
  // Stored on the account (website); read fresh for every log.
  const dpsReportToken = await authService.currentDpsReportToken();

  for (let attempt = 1; ; attempt++) {
    try {
      const res = await dpsReportClient.upload(entry.filePath, dpsReportToken);
      stateStore.updateUpload(entry.id, {
        permalink: res.permalink,
        bossName: res.encounter?.boss ?? null,
        success: res.encounter?.success ?? null,
        isCM: !!res.encounter?.isCm,
        isLegendaryCM: !!res.encounter?.isLegendaryCm,
        durationMs: res.encounter ? res.encounter.duration * 1000 : null,
        encounterStart: res.encounterTime ? new Date(res.encounterTime * 1000).toISOString() : null,
      });
      logger.info("Uploaded to dps.report", res.permalink);
      return;
    } catch (err) {
      if (attempt >= DPS_REPORT_ATTEMPTS || !isRetryable(err)) throw err;
      logger.warn(`dps.report attempt ${attempt} failed, retrying`, err);
      await sleep(5_000 * attempt);
    }
  }
}

/** Sends the permalink to GW2 ArcDPS Helper, which fetches the full log and stores it for the web app. */
async function syncToWeb(id: string): Promise<void> {
  const entry = stateStore.updateUpload(id, { stage: "syncing", errorCode: null, errorDetail: null })!;
  const credentials = authService.getCredentials();
  if (!credentials) throw new AppError("NOT_SIGNED_IN", "Sign in to save logs to GW2 ArcDPS Helper.");

  try {
    const submit = (sessionId: string | null) =>
      backendClient.submitLogs(credentials.apiUrl, credentials.token, [entry.permalink!], sessionId);
    // If the session was deleted on the website meanwhile, save the log without it.
    const [result] = await submit(entry.sessionId ?? null).catch((err) => {
      if (err instanceof AppError && err.code === "SESSION_NOT_FOUND") return submit(null);
      throw err;
    });
    if (!result || result.status === "error") {
      throw new AppError("SYNC_FAILED", result?.message ?? "GW2 ArcDPS Helper did not accept the log.");
    }
    stateStore.updateUpload(id, {
      stage: "done",
      webLogId: result.logId,
      encounterKey: result.log.encounterKey,
      groupName: result.group?.name ?? null,
      bossName: result.log.bossName,
      success: result.log.success,
      isCM: result.log.isCM,
      isLegendaryCM: result.log.isLegendaryCM,
    });
    // A raid kill can complete a boss of the weekly clear.
    if (result.log.success && result.log.category === "raid") void clearsService.refresh();
  } catch (err) {
    if (err instanceof AppError && err.status === 401) {
      authService.handleUnauthorized();
      throw new AppError("NOT_SIGNED_IN", "Your session expired. Sign in again and retry.");
    }
    throw err instanceof AppError && err.code !== "NETWORK_ERROR" ? err : new AppError("SYNC_FAILED", (err as Error).message);
  }
}

function fail(id: string, err: unknown, fallbackCode: UploadEntry["errorCode"]) {
  const code = (err instanceof AppError ? err.code : null) as UploadEntry["errorCode"];
  const known: UploadEntry["errorCode"][] = ["DPS_REPORT_FAILED", "SYNC_FAILED", "NOT_SIGNED_IN", "FILE_UNREADABLE"];
  stateStore.updateUpload(id, {
    stage: "failed",
    errorCode: known.includes(code) ? code : fallbackCode,
    errorDetail: err instanceof Error ? err.message : String(err),
  });
  logger.error("Upload failed", { file: stateStore.getUpload(id)?.fileName, err: String(err) });
}

async function runPipeline(id: string, waitForFile: boolean): Promise<void> {
  const entry = stateStore.getUpload(id);
  if (!entry) return;

  if (!entry.permalink) {
    try {
      if (waitForFile) await waitUntilWritten(entry.filePath);
    } catch (err) {
      return fail(id, err, "FILE_UNREADABLE");
    }
    try {
      await uploadToDpsReport(entry);
    } catch (err) {
      fail(id, err, "DPS_REPORT_FAILED");
      return notifier.uploadFinished(stateStore.getUpload(id)!);
    }
  }

  try {
    await syncToWeb(id);
  } catch (err) {
    fail(id, err, "SYNC_FAILED");
  }
  notifier.uploadFinished(stateStore.getUpload(id)!);
}

// One upload at a time keeps dps.report happy and the log order stable.
let queue: Promise<void> = Promise.resolve();
const schedule = (task: () => Promise<void>) => {
  queue = queue.then(task).catch((err) => logger.error("Upload queue error", err));
};

export const uploadService = {
  /** Queues a new log file (from the folder watcher or the file picker). */
  enqueue(filePath: string, waitForFile = true): void {
    const entry = newEntry(filePath);
    stateStore.addUpload(entry);
    schedule(() => runPipeline(entry.id, waitForFile));
  },

  /** Retries a failed entry; if it already reached dps.report only the GW2 ArcDPS Helper step is repeated. */
  retry(id: string): void {
    const entry = stateStore.getUpload(id);
    if (!entry || entry.stage !== "failed") return;
    stateStore.updateUpload(id, { stage: "queued", errorCode: null, errorDetail: null });
    schedule(() => runPipeline(id, false));
  },

  clearFinished(): void {
    stateStore.removeUploads((u) => u.stage === "done" || u.stage === "failed");
  },
};
