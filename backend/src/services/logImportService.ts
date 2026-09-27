import { PARALLEL_FETCHES } from "../config/constants";
import { GROUPS } from "../data/encounters";
import { logRepository } from "../repositories/logRepository";
import type { Log, LogSummary } from "../types/log.types";
import type { ImportedLog, SubmitResult } from "../types/submit.types";
import { parsePermalink } from "../utils/permalink";
import { fetchEliteInsightsJson, fetchUploadMetadata, logUrl, uploadLogFile } from "./clients/dpsReportClient";
import { parseFromEliteInsights, parseFromMetadata } from "./logParser";

export async function fetchLogSummary(permalink: string): Promise<LogSummary> {
  const url = logUrl(permalink);
  const [meta, ei] = await Promise.all([fetchUploadMetadata(permalink), fetchEliteInsightsJson(permalink)]);
  return ei ? parseFromEliteInsights(permalink, url, ei, meta) : parseFromMetadata(permalink, url, meta);
}

function toImported(log: Log): ImportedLog {
  return {
    logId: log.id,
    bossName: log.bossName,
    success: log.success,
    log,
    group: GROUPS.find((g) => g.id === log.groupId) ?? null,
  };
}

export async function importLog(ownerId: string, url: string, sessionId: string | null = null): Promise<SubmitResult> {
  const permalink = parsePermalink(url);
  if (!permalink) return { url, status: "error", code: "INVALID_LINK", message: "Not a valid dps.report link." };

  const existing = await logRepository.findByPermalink(ownerId, permalink);
  if (existing) {
    // A log added earlier without a session still joins the session it is re-uploaded in.
    if (sessionId && !existing.sessionId) {
      await logRepository.attachToSession(ownerId, existing.id, sessionId);
      existing.sessionId = sessionId;
    }
    return { url, status: "duplicate", ...toImported(existing) };
  }

  try {
    const summary = await fetchLogSummary(permalink);
    const id = await logRepository.create(ownerId, summary, sessionId);
    // A null id means the same link was stored concurrently — report it as a duplicate.
    const stored = await logRepository.findByPermalink(ownerId, permalink);
    if (!stored) throw new Error("Log was not stored.");
    return { url, status: id ? "ok" : "duplicate", ...toImported(stored) };
  } catch (err) {
    console.warn("Failed to import log", url, err);
    return { url, status: "error", code: "FETCH_FAILED", message: err instanceof Error ? err.message : String(err) };
  }
}

/** Uploads a log file to dps.report on the user's behalf, then imports the resulting link. */
export async function importLogFile(
  ownerId: string,
  content: Buffer,
  fileName: string,
  dpsReportToken: string | null = null,
): Promise<SubmitResult> {
  let url: string;
  try {
    url = await uploadLogFile(content, fileName, dpsReportToken);
  } catch (err) {
    console.warn("dps.report upload failed", fileName, err);
    const message = err instanceof Error ? err.message : String(err);
    return { url: fileName, status: "error", code: "DPS_REPORT_UPLOAD_FAILED", message };
  }
  return importLog(ownerId, url);
}

/** Imports links in small parallel batches to stay polite towards dps.report. */
export async function importLogs(ownerId: string, urls: string[], sessionId: string | null = null): Promise<SubmitResult[]> {
  const results: SubmitResult[] = [];
  for (let i = 0; i < urls.length; i += PARALLEL_FETCHES) {
    const chunk = urls.slice(i, i + PARALLEL_FETCHES);
    results.push(...(await Promise.all(chunk.map((url) => importLog(ownerId, url, sessionId)))));
  }
  return results;
}
