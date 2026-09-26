import type { Log } from "../domain/types/log.types";
import type { SubmitLogsResponse, SubmitResult } from "../domain/types/upload.types";
import { http } from "./httpClient";
import { toLog, type LogDto } from "./logMapper";

export const logRepository = {
  async list(): Promise<Log[]> {
    return (await http.get<{ logs: LogDto[] }>("/logs")).logs.map(toLog);
  },

  /** Imports up to MAX_URLS_PER_CALL dps.report links. */
  async submit(urls: string[]): Promise<SubmitResult[]> {
    return (await http.post<SubmitLogsResponse>("/logs", { urls })).results;
  },

  delete: (id: string) => http.delete(`/logs/${encodeURIComponent(id)}`),
};
