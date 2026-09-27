import { LOG_FILE_EXTENSIONS, MAX_URLS_PER_CALL } from "../config/constants";
import { logRepository } from "../repositories/logRepository";
import type { Log, LogFilter } from "../domain/types/log.types";
import type { SubmitResult, UploadSummary } from "../domain/types/upload.types";

const DPS_REPORT_LINK_RE = /https?:\/\/(?:[a-z0-9-]+\.)?dps\.report\/[A-Za-z0-9_-]+/gi;

export const logService = {
  list: (): Promise<Log[]> => logRepository.list(),

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
      failed: results.filter((r) => r.status === "error").length,
    };
  },

  filter(logs: Log[], f: LogFilter): Log[] {
    const q = f.search.trim().toLowerCase();
    return logs.filter(
      (l) =>
        (f.category === "all" || l.category === f.category) &&
        (f.groupId === "all" || l.groupId === f.groupId) &&
        (f.result === "all" || (f.result === "kill") === l.success) &&
        (!q ||
          l.bossName.toLowerCase().includes(q) ||
          l.accounts.some((a) => a.toLowerCase().includes(q)) ||
          l.players.some((p) => p.name.toLowerCase().includes(q))),
    );
  },

  delete: (id: string) => logRepository.delete(id),
  share: (id: string) => logRepository.share(id),
  unshare: (id: string) => logRepository.unshare(id),
  getShared: (token: string) => logRepository.getShared(token),
};
