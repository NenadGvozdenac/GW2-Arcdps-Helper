import type { Log, SharedLog } from "../domain/types/log.types";
import type { SubmitLogsResponse, SubmitResult, UploadLogFileResponse } from "../domain/types/upload.types";
import { http } from "./httpClient";
import { fromSharedLogDto, toLog, type LogDto, type SharedLogDto } from "./logMapper";

export const logRepository = {
  async list(): Promise<Log[]> {
    return (await http.get<{ logs: LogDto[] }>("/logs")).logs.map(toLog);
  },

  /** Imports up to MAX_URLS_PER_CALL dps.report links. */
  async submit(urls: string[]): Promise<SubmitResult[]> {
    return (await http.post<SubmitLogsResponse>("/logs", { urls })).results;
  },

  /** Sends one ArcDPS log file; the backend uploads it to dps.report and imports it. */
  async uploadFile(file: File): Promise<SubmitResult> {
    const form = new FormData();
    form.append("file", file, file.name);
    return (await http.post<UploadLogFileResponse>("/logs/upload", form)).result;
  },

  /** Creates (or returns the existing) public link token. */
  async share(id: string): Promise<Log> {
    return toLog((await http.post<{ log: LogDto }>(`/logs/${encodeURIComponent(id)}/share`)).log);
  },

  /** Revokes the public link. */
  async unshare(id: string): Promise<Log> {
    return toLog((await http.deleteJson<{ log: LogDto }>(`/logs/${encodeURIComponent(id)}/share`)).log);
  },

  /** Public: a shared log (works without signing in). */
  async getShared(token: string): Promise<SharedLog> {
    const body = await http.get<{ log: SharedLogDto; owner: string }>(`/shared/logs/${encodeURIComponent(token)}`);
    return { log: fromSharedLogDto(body.log), owner: body.owner };
  },

  delete: (id: string) => http.delete(`/logs/${encodeURIComponent(id)}`),
};
