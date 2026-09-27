import type { Log } from "../domain/types/log.types";

/** Log as serialized over JSON (dates are ISO strings). */
export type LogDto = Omit<Log, "encounterTime" | "uploadedAt"> & { encounterTime: string; uploadedAt: string | null };

/** A log on a public shared page arrives without owner / session ids and its share secret. */
export type SharedLogDto = Omit<LogDto, "ownerId" | "sessionId" | "shareToken">;

export const fromSharedLogDto = (dto: SharedLogDto): Log => toLog({ ...dto, ownerId: "", sessionId: null, shareToken: null });

export const toLog = (dto: LogDto): Log => ({
  ...dto,
  encounterTime: new Date(dto.encounterTime),
  uploadedAt: dto.uploadedAt ? new Date(dto.uploadedAt) : null,
});
