import type { Log, LogFilter, LogPage, SharedLog } from "../domain/types/log.types";
import type { SubmitLogsResponse, SubmitResult, UploadLogFileResponse } from "../domain/types/upload.types";
import { http } from "./httpClient";
import { fromSharedLogDto, toLog, type LogDto, type SharedLogDto } from "./logMapper";

const searchQuery = (filter: LogFilter, extra: Record<string, string>) =>
  new URLSearchParams({ ...filter, ...extra }).toString();

export const logRepository = {
  async list(): Promise<Log[]> {
    return (await http.get<{ logs: LogDto[] }>("/logs")).logs.map(toLog);
  },

  /** One page of logs matching the filter, searched on the server. */
  async search(filter: LogFilter, page: number, pageSize: number): Promise<LogPage> {
    const query = searchQuery(filter, { page: String(page), pageSize: String(pageSize) });
    const body = await http.get<{ logs: LogDto[]; total: number }>(`/logs/search?${query}`);
    return { logs: body.logs.map(toLog), total: body.total };
  },

  /** Ids of every log matching the filter (for "select all"). */
  async searchIds(filter: LogFilter): Promise<string[]> {
    return (await http.get<{ ids: string[] }>(`/logs/search?${searchQuery(filter, { idsOnly: "true" })}`)).ids;
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

  /** Deletes several logs at once. */
  deleteMany: (ids: string[]) => http.post<{ deleted: number }>("/logs/bulk-delete", { ids }),
};
