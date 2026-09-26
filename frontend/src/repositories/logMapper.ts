import type { Log } from "../domain/types/log.types";

/** Log as serialized over JSON (dates are ISO strings). */
export type LogDto = Omit<Log, "encounterTime" | "uploadedAt"> & { encounterTime: string; uploadedAt: string | null };

export const toLog = (dto: LogDto): Log => ({
  ...dto,
  encounterTime: new Date(dto.encounterTime),
  uploadedAt: dto.uploadedAt ? new Date(dto.uploadedAt) : null,
});
