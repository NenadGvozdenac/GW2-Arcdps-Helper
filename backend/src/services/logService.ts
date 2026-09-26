import { logRepository } from "../repositories/logRepository";
import type { Log } from "../types/log.types";
import { logNotFound } from "../utils/httpError";

export const logService = {
  list: (ownerId: string): Promise<Log[]> => logRepository.listByOwner(ownerId),

  async get(ownerId: string, id: string): Promise<Log> {
    const log = await logRepository.findById(ownerId, id);
    if (!log) throw logNotFound();
    return log;
  },

  async delete(ownerId: string, id: string): Promise<void> {
    if (!(await logRepository.delete(ownerId, id))) throw logNotFound();
  },
};
