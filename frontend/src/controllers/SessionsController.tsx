import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { sessionService } from "../services/sessionService";
import type { Session, SessionPatch } from "../domain/types/session.types";
import { useAuth } from "./AuthController";
import { useLogs } from "./LogsController";
import { usePolling } from "../hooks/usePolling";

interface SessionsContextValue {
  /** The user's sessions in display order (pinned first, then the manual order). */
  sessions: Session[];
  loading: boolean;
  /** Raw error from the last load; the presentation layer turns it into a message. */
  error: unknown;
  refresh: () => Promise<void>;
  /** Deletes a session; its logs stay. */
  removeSession: (id: string) => Promise<void>;
  /** Deletes several sessions at once; their logs stay. */
  removeSessions: (ids: string[]) => Promise<void>;
  /** Takes logs out of an ended session; with `deleteLogs` they are deleted altogether. */
  removeSessionLogs: (id: string, logIds: string[], deleteLogs: boolean) => Promise<void>;
  /** Re-opens a session that ended automatically; another active session is ended by the server. */
  resumeSession: (id: string) => Promise<void>;
  /** Creates (or with false, revokes) the session's public link. */
  setSessionShared: (id: string, shared: boolean) => Promise<void>;
  /** Renames and / or pins a session. */
  updateSession: (id: string, patch: SessionPatch) => Promise<void>;
  /** Drag & drop: the session takes the place of `overId`; the list is re-fetched afterwards (also on failure). */
  moveSession: (id: string, overId: string) => Promise<void>;
}

const SessionsContext = createContext<SessionsContextValue | null>(null);

/**
 * Loads the signed-in user's sessions and shares them with every page, polling like the logs do so sessions
 * started / ended in the desktop uploader show up without reloading the page.
 */
export function SessionsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { detachSessions, detachLogs } = useLogs();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const refresh = useCallback(async () => {
    try {
      setSessions(await sessionService.list());
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeSession = useCallback(
    async (id: string) => {
      await sessionService.delete(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      detachSessions([id]);
    },
    [detachSessions],
  );

  const removeSessions = useCallback(
    async (ids: string[]) => {
      await sessionService.deleteMany(ids);
      const gone = new Set(ids);
      setSessions((prev) => prev.filter((s) => !gone.has(s.id)));
      detachSessions(ids);
    },
    [detachSessions],
  );

  const removeSessionLogs = useCallback(
    async (id: string, logIds: string[], deleteLogs: boolean) => {
      await sessionService.removeLogs(id, logIds, deleteLogs);
      detachLogs(logIds, deleteLogs);
    },
    [detachLogs],
  );

  const resumeSession = useCallback(async (id: string) => {
    await sessionService.resume(id);
    // Re-fetch: resuming may also have ended another session on the server.
    setSessions(await sessionService.list());
  }, []);

  const setSessionShared = useCallback(async (id: string, shared: boolean) => {
    const updated = shared ? await sessionService.share(id) : await sessionService.unshare(id);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const updateSession = useCallback(async (id: string, patch: SessionPatch) => {
    const updated = await sessionService.update(id, patch);
    setSessions((prev) => sessionService.pinnedFirst(prev.map((s) => (s.id === id ? updated : s))));
  }, []);

  const moveSession = useCallback(
    async (id: string, overId: string) => {
      try {
        await sessionService.move(id, overId);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  useEffect(() => {
    setSessions([]);
    setError(null);
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [user?.id, refresh]);
  usePolling(refresh, !!user);

  const value = useMemo(
    () => ({
      sessions,
      loading: authLoading || loading,
      error,
      refresh,
      removeSession,
      removeSessions,
      removeSessionLogs,
      resumeSession,
      setSessionShared,
      updateSession,
      moveSession,
    }),
    [
      sessions,
      authLoading,
      loading,
      error,
      refresh,
      removeSession,
      removeSessions,
      removeSessionLogs,
      resumeSession,
      setSessionShared,
      updateSession,
      moveSession,
    ],
  );
  return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}

export function useSessions() {
  const ctx = useContext(SessionsContext);
  if (!ctx) throw new Error("useSessions must be used inside <SessionsProvider>");
  return ctx;
}
