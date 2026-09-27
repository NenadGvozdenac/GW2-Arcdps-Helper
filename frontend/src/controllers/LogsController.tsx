import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FRESH_HIGHLIGHT_MS, POLL_INTERVAL_MS } from "../config/constants";
import { logService } from "../services/logService";
import { sessionService } from "../services/sessionService";
import type { Log } from "../domain/types/log.types";
import type { Session, SessionPatch } from "../domain/types/session.types";
import { useAuth } from "./AuthController";

interface LogsContextValue {
  logs: Log[];
  /** The user's sessions, newest first (loaded and refreshed together with the logs). */
  sessions: Session[];
  loading: boolean;
  /** Raw error from the last load; the presentation layer turns it into a message. */
  error: unknown;
  /** Ids of logs that appeared in the last refresh (for highlighting). */
  freshIds: ReadonlySet<string>;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Deletes several logs at once. */
  removeMany: (ids: string[]) => Promise<void>;
  /** Deletes a session; its logs stay. */
  removeSession: (id: string) => Promise<void>;
  /** Deletes several sessions at once; their logs stay. */
  removeSessions: (ids: string[]) => Promise<void>;
  /** Re-opens a session that ended automatically; another active session is ended by the server. */
  resumeSession: (id: string) => Promise<void>;
  /** Creates (or with false, revokes) the session's public link. */
  setSessionShared: (id: string, shared: boolean) => Promise<void>;
  /** Creates (or with false, revokes) the log's public link. */
  setLogShared: (id: string, shared: boolean) => Promise<void>;
  /** Renames and / or pins a session. */
  updateSession: (id: string, patch: SessionPatch) => Promise<void>;
  /** Saves a new manual order (session ids in display order); applied immediately, rolled back if saving fails. */
  reorderSessions: (ids: string[]) => Promise<void>;
}

const LogsContext = createContext<LogsContextValue | null>(null);

const isTabVisible = () => document.visibilityState === "visible";

/**
 * Loads the signed-in user's logs and shares them with every page.
 * Re-fetches every POLL_INTERVAL_MS while the tab is visible, and right away when it becomes visible again,
 * so logs sent by the desktop uploader show up without reloading the page.
 */
export function LogsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  /** Ids from the previous successful load; null until the first load, so nothing is highlighted initially. */
  const knownIds = useRef<Set<string> | null>(null);

  const highlight = useCallback((ids: string[]) => {
    if (!ids.length) return;
    setFreshIds((prev) => new Set([...prev, ...ids]));
    setTimeout(() => {
      setFreshIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    }, FRESH_HIGHLIGHT_MS);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [next, nextSessions] = await Promise.all([logService.list(), sessionService.list()]);
      if (knownIds.current) highlight(next.filter((l) => !knownIds.current!.has(l.id)).map((l) => l.id));
      knownIds.current = new Set(next.map((l) => l.id));
      setLogs(next);
      setSessions(nextSessions);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [highlight]);

  const remove = useCallback(async (id: string) => {
    await logService.delete(id);
    knownIds.current?.delete(id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const removeMany = useCallback(async (ids: string[]) => {
    await logService.deleteMany(ids);
    const gone = new Set(ids);
    for (const id of ids) knownIds.current?.delete(id);
    setLogs((prev) => prev.filter((l) => !gone.has(l.id)));
  }, []);

  const removeSession = useCallback(async (id: string) => {
    await sessionService.delete(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setLogs((prev) => prev.map((l) => (l.sessionId === id ? { ...l, sessionId: null } : l)));
  }, []);

  const removeSessions = useCallback(async (ids: string[]) => {
    await sessionService.deleteMany(ids);
    const gone = new Set(ids);
    setSessions((prev) => prev.filter((s) => !gone.has(s.id)));
    setLogs((prev) => prev.map((l) => (l.sessionId && gone.has(l.sessionId) ? { ...l, sessionId: null } : l)));
  }, []);

  const resumeSession = useCallback(async (id: string) => {
    await sessionService.resume(id);
    // Re-fetch: resuming may also have ended another session on the server.
    setSessions(await sessionService.list());
  }, []);

  const setSessionShared = useCallback(async (id: string, shared: boolean) => {
    const updated = shared ? await sessionService.share(id) : await sessionService.unshare(id);
    setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
  }, []);

  const setLogShared = useCallback(async (id: string, shared: boolean) => {
    const updated = shared ? await logService.share(id) : await logService.unshare(id);
    setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  const updateSession = useCallback(async (id: string, patch: SessionPatch) => {
    const updated = await sessionService.update(id, patch);
    setSessions((prev) => sessionService.pinnedFirst(prev.map((s) => (s.id === id ? updated : s))));
  }, []);

  const reorderSessions = useCallback(async (ids: string[]) => {
    let previous: Session[] = [];
    setSessions((prev) => {
      previous = prev;
      const byId = new Map(prev.map((s) => [s.id, s]));
      return ids.flatMap((id) => byId.get(id) ?? []);
    });
    try {
      await sessionService.reorder(ids);
    } catch (err) {
      setSessions(previous);
      throw err;
    }
  }, []);

  useEffect(() => {
    setLogs([]);
    setSessions([]);
    setError(null);
    knownIds.current = null;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();

    const timer = setInterval(() => {
      if (isTabVisible()) refresh();
    }, POLL_INTERVAL_MS);
    const onVisibility = () => {
      if (isTabVisible()) refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id, refresh]);

  // Layout shows a full-screen spinner until both the user and their logs are known.
  const value = useMemo(
    () => ({
      logs,
      sessions,
      loading: authLoading || loading,
      error,
      freshIds,
      refresh,
      remove,
      removeMany,
      removeSession,
      removeSessions,
      resumeSession,
      setSessionShared,
      setLogShared,
      updateSession,
      reorderSessions,
    }),
    [
      logs,
      sessions,
      authLoading,
      loading,
      error,
      freshIds,
      refresh,
      remove,
      removeMany,
      removeSession,
      removeSessions,
      resumeSession,
      setSessionShared,
      setLogShared,
      updateSession,
      reorderSessions,
    ],
  );
  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}

export function useLogs() {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error("useLogs must be used inside <LogsProvider>");
  return ctx;
}
