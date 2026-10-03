import type { Session, SessionListItem, SessionPatch, SharedSession } from "../domain/types/session.types";
import type { LogDetail } from "../domain/types/log.types";
import { fromSharedLogDto, toLog, type LogDetailDto, type SharedLogDto } from "./logMapper";
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
  pinned: dto.pinned,
});

/** A sessions-list item as the server sends it: wings / fractals / strikes as ids. */
export type SessionListItemDto = Omit<SessionListItem, "groups"> & { groupIds: string[] };

const sessionPath = (id: string) => `/sessions/${encodeURIComponent(id)}`;

export const sessionRepository = {
  async list(): Promise<Session[]> {
    return (await http.get<{ sessions: SessionDto[] }>("/sessions")).sessions.map(toSession);
  },

  /** One page of the sessions list, with each session's totals computed by the server. */
  async page(page: number, pageSize: number): Promise<{ sessions: SessionListItemDto[]; total: number }> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
    const body = await http.get<{
      sessions: (Omit<SessionListItemDto, "session" | "span"> & {
        session: SessionDto;
        span: { start: string; end: string; durationMs: number } | null;
      })[];
      total: number;
    }>(`/sessions/page?${query}`);
    return {
      sessions: body.sessions.map((s) => ({
        ...s,
        session: toSession(s.session),
        span: s.span && { start: new Date(s.span.start), end: new Date(s.span.end), durationMs: s.span.durationMs },
      })),
      total: body.total,
    };
  },

  /** Re-opens a session that ended automatically after 6 hours. */
  async resume(id: string): Promise<Session> {
    return toSession((await http.post<{ session: SessionDto }>(`/sessions/${encodeURIComponent(id)}/resume`)).session);
  },

  /** Rename and / or pin. */
  async update(id: string, patch: SessionPatch): Promise<Session> {
    return toSession((await http.patch<{ session: SessionDto }>(sessionPath(id), patch)).session);
  },

  /** Deletes several sessions at once (their logs are kept). */
  deleteMany: (ids: string[]) => http.post<{ deleted: number }>("/sessions/bulk-delete", { ids }),

  /** Takes logs out of an ended session; with `deleteLogs` they are deleted altogether. */
  removeLogs: (id: string, ids: string[], deleteLogs: boolean) =>
    http.post<{ removed: number }>(`${sessionPath(id)}/remove-logs`, { ids, deleteLogs }),

  /** Drag & drop: the session takes the place of `overId`. */
  move: (id: string, overId: string) => http.post<void>(`${sessionPath(id)}/move`, { overId }),

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

  /** The session's logs with their squads, oldest first. */
  async logs(id: string): Promise<LogDetail[]> {
    const body = await http.get<{ logs: LogDetailDto[] }>(`/sessions/${encodeURIComponent(id)}/logs`);
    return body.logs.map((l) => toLog<LogDetail>(l));
  },

  delete: (id: string) => http.delete(`/sessions/${encodeURIComponent(id)}`),
};
