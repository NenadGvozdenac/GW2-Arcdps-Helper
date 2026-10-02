import { LOG_FILE_EXTENSIONS, LOGS_PAGE_SIZE, LOGS_PAGE_SIZE_OPTIONS, MAX_URLS_PER_CALL } from "../config/constants";
import { logRepository } from "../repositories/logRepository";
import { logsPageSizeStorage } from "../storage/logsPageSizeStorage";
import type { Log, LogDetail, LogFilter, LogPage } from "../domain/types/log.types";
import type { SubmitResult, UploadSummary } from "../domain/types/upload.types";

const DPS_REPORT_LINK_RE = /https?:\/\/(?:[a-z0-9-]+\.)?dps\.report\/[A-Za-z0-9_-]+/gi;

export const logService = {
  list: (): Promise<Log[]> => logRepository.list(),
  /** One log with its squad (the lists leave the squad out). */
  get: (id: string): Promise<LogDetail> => logRepository.get(id),
  /** One page of logs matching the filter; the server does the searching. */
  search: (filter: LogFilter, page: number, pageSize: number): Promise<LogPage> =>
    logRepository.search(filter, page, pageSize),
  searchIds: (filter: LogFilter): Promise<string[]> => logRepository.searchIds(filter),

  /** Logs per page on "All logs" the user picked last time (the default if none, or no longer offered). */
  savedPageSize(): number {
    const stored = logsPageSizeStorage.get();
    return stored && LOGS_PAGE_SIZE_OPTIONS.includes(stored) ? stored : LOGS_PAGE_SIZE;
  },
  savePageSize: (size: number) => logsPageSizeStorage.set(size),

  /** Pulls every dps.report link out of arbitrary pasted text. */
  extractLinks(text: string): string[] {
    return [...new Set(text.match(DPS_REPORT_LINK_RE) ?? [])];
  },

  /** Submits links in batches the API accepts, reporting progress after each batch. */
  async upload(urls: string[], onProgress?: (done: number) => void): Promise<SubmitResult[]> {
    const results: SubmitResult[] = [];
    for (let i = 0; i < urls.length; i += MAX_URLS_PER_CALL) {
      results.push(...(await logRepository.submit(urls.slice(i, i + MAX_URLS_PER_CALL))));
      onProgress?.(results.length);
    }
    return results;
  },

  /** Keeps only ArcDPS log files (by extension). */
  logFilesOnly: (files: Iterable<File>): File[] =>
    [...files].filter((f) => LOG_FILE_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))),

  /** Sends one log file to the backend, which uploads it to dps.report and imports it. */
  uploadFile: (file: File): Promise<SubmitResult> => logRepository.uploadFile(file),

  summarize(results: SubmitResult[]): UploadSummary {
    return {
      added: results.filter((r) => r.status === "ok").length,
      duplicates: results.filter((r) => r.status === "duplicate").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      failed: results.filter((r) => r.status === "error").length,
    };
  },

  delete: (id: string) => logRepository.delete(id),
  deleteMany: (ids: string[]) => logRepository.deleteMany(ids),
  share: (id: string) => logRepository.share(id),
  unshare: (id: string) => logRepository.unshare(id),
  getShared: (token: string) => logRepository.getShared(token),
};
