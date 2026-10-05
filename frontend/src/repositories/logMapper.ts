import type { Log, LogDetail, LogSearchItem } from "../domain/types/log.types";

type Serialized<T extends Log> = Omit<T, "encounterTime" | "uploadedAt"> & { encounterTime: string; uploadedAt: string | null };

/** Log as serialized over JSON (dates are ISO strings). */
export type LogDto = Serialized<Log>;
export type LogSearchItemDto = Serialized<LogSearchItem>;
export type LogDetailDto = Serialized<LogDetail>;

/** A log on a public shared page arrives without owner / session ids and its share secret. */
export type SharedLogDto = Omit<LogDetailDto, "ownerId" | "sessionId" | "shareToken">;

export const fromSharedLogDto = (dto: SharedLogDto): LogDetail =>
  toLog({ ...dto, ownerId: "", sessionId: null, shareToken: null });

export const toLog = <T extends Log>(dto: Serialized<T>): T =>
  ({
    ...dto,
    encounterTime: new Date(dto.encounterTime),
    uploadedAt: dto.uploadedAt ? new Date(dto.uploadedAt) : null,
  }) as T;
