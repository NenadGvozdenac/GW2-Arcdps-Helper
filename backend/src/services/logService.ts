import { randomBytes } from "node:crypto";
import { SHARE_TOKEN_BYTES } from "../config/constants";
import { logRepository } from "../repositories/logRepository";
import type { Log, LogFilter, LogPage, SharedLog, SharedLogResponse } from "../types/log.types";
import { logNotFound } from "../utils/httpError";
import { userService } from "./userService";

/** Strips what a public viewer must not see (owner / session ids, the share secret). */
export const toSharedLog = ({ ownerId: _o, sessionId: _s, shareToken: _t, ...log }: Log): SharedLog => log;

export const logService = {
  list: (ownerId: string): Promise<Log[]> => logRepository.listByOwner(ownerId),

  /** One page of the owner's logs matching the filter, newest first. */
  search: (ownerId: string, filter: LogFilter, page: number, pageSize: number): Promise<LogPage> =>
    logRepository.search(ownerId, filter, page, pageSize),

  /** Ids of every log matching the filter. */
  searchIds: (ownerId: string, filter: LogFilter): Promise<string[]> => logRepository.searchIds(ownerId, filter),

  async get(ownerId: string, id: string): Promise<Log> {
    const log = await logRepository.findById(ownerId, id);
    if (!log) throw logNotFound();
    return log;
  },

  /** Creates the public read-only link for the log (or returns the existing one). */
  async share(ownerId: string, id: string): Promise<Log> {
    const log = await logService.get(ownerId, id);
    if (log.shareToken) return log;
    const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
    return (await logRepository.setShareToken(ownerId, id, token)) ?? log;
  },

  /** Revokes the public link; the old URL stops working. */
  async unshare(ownerId: string, id: string): Promise<Log> {
    const log = await logRepository.setShareToken(ownerId, id, null);
    if (!log) throw logNotFound();
    return log;
  },

  /** What anyone with the share link may see. */
  async getShared(token: string): Promise<SharedLogResponse> {
    const log = await logRepository.findByShareToken(token);
    if (!log) throw logNotFound();
    const owner = await userService.get(log.ownerId);
    return { log: toSharedLog(log), owner: owner.gw2Account };
  },

  /** Deletes several logs at once; returns how many were deleted. */
  deleteMany: (ownerId: string, ids: string[]) => logRepository.deleteMany(ownerId, [...new Set(ids)]),

  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await logRepository.delete(ownerId, id))) throw logNotFound();
  },
};
