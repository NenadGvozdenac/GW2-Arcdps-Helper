import type { Session } from "../domain/types/session.types";
import { http } from "./httpClient";

/** Session as serialized over JSON (dates are ISO strings). */
type SessionDto = Omit<Session, "startedAt" | "endedAt" | "expiresAt"> & {
  startedAt: string;
  endedAt: string | null;
  expiresAt: string;
};

const toSession = (dto: SessionDto): Session => ({
  id: dto.id,
  name: dto.name,
  startedAt: new Date(dto.startedAt),
  endedAt: dto.endedAt ? new Date(dto.endedAt) : null,
  endReason: dto.endReason,
  expiresAt: new Date(dto.expiresAt),
});

export const sessionRepository = {
  async list(): Promise<Session[]> {
    return (await http.get<{ sessions: SessionDto[] }>("/sessions")).sessions.map(toSession);
  },

  /** Re-opens a session that ended automatically after 6 hours. */
  async resume(id: string): Promise<Session> {
    return toSession((await http.post<{ session: SessionDto }>(`/sessions/${encodeURIComponent(id)}/resume`)).session);
  },

  delete: (id: string) => http.delete(`/sessions/${encodeURIComponent(id)}`),
};
