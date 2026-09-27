import type { Session, SharedSession } from "../domain/types/session.types";
import { fromSharedLogDto, type SharedLogDto } from "./logMapper";
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
  shareToken: dto.shareToken,
});

const sessionPath = (id: string) => `/sessions/${encodeURIComponent(id)}`;

export const sessionRepository = {
  async list(): Promise<Session[]> {
    return (await http.get<{ sessions: SessionDto[] }>("/sessions")).sessions.map(toSession);
  },

  /** Re-opens a session that ended automatically after 6 hours. */
  async resume(id: string): Promise<Session> {
    return toSession((await http.post<{ session: SessionDto }>(`/sessions/${encodeURIComponent(id)}/resume`)).session);
  },

  /** Creates (or returns the existing) public link token. */
  async share(id: string): Promise<Session> {
    return toSession((await http.post<{ session: SessionDto }>(`${sessionPath(id)}/share`)).session);
  },

  /** Revokes the public link. */
  async unshare(id: string): Promise<Session> {
    return toSession((await http.deleteJson<{ session: SessionDto }>(`${sessionPath(id)}/share`)).session);
  },

  /** Public: a shared session with its logs (works without signing in). */
  async getShared(token: string): Promise<SharedSession> {
    const body = await http.get<{
      session: { name: string; startedAt: string; endedAt: string | null; endReason: Session["endReason"] };
      owner: string;
      logs: SharedLogDto[];
    }>(`/shared/sessions/${encodeURIComponent(token)}`);
    return {
      session: {
        name: body.session.name,
        startedAt: new Date(body.session.startedAt),
        endedAt: body.session.endedAt ? new Date(body.session.endedAt) : null,
        endReason: body.session.endReason,
      },
      owner: body.owner,
      logs: body.logs.map(fromSharedLogDto),
    };
  },

  delete: (id: string) => http.delete(`/sessions/${encodeURIComponent(id)}`),
};
