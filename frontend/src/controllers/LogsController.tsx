import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FRESH_HIGHLIGHT_MS } from "../config/constants";
import { logService } from "../services/logService";
import type { Log } from "../domain/types/log.types";
import { useAuth } from "./AuthController";
import { usePolling } from "../hooks/usePolling";

interface LogsContextValue {
  logs: Log[];
  loading: boolean;
  /** Raw error from the last load; the presentation layer turns it into a message. */
  error: unknown;
  /** Ids of logs that appeared in the last refresh (for highlighting). */
  freshIds: ReadonlySet<string>;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  /** Deletes several logs at once. */
  removeMany: (ids: string[]) => Promise<void>;
  /** Creates (or with false, revokes) the log's public link. */
  setLogShared: (id: string, shared: boolean) => Promise<void>;
  /** After sessions were deleted (their logs are kept): their logs no longer belong to a session. */
  detachSessions: (sessionIds: string[]) => void;
  /** After logs were taken out of their session: they no longer belong to it, or with `deleted` are gone. */
  detachLogs: (ids: string[], deleted: boolean) => void;
}

const LogsContext = createContext<LogsContextValue | null>(null);

/**
 * Loads the signed-in user's logs and shares them with every page.
 * Re-fetches every POLL_INTERVAL_MS while the tab is visible, and right away when it becomes visible again,
 * so logs sent by the desktop uploader show up without reloading the page.
 */
export function LogsProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [logs, setLogs] = useState<Log[]>([]);
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
      const next = await logService.list();
      if (knownIds.current) highlight(next.filter((l) => !knownIds.current!.has(l.id)).map((l) => l.id));
      knownIds.current = new Set(next.map((l) => l.id));
      setLogs(next);
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

  const detachSessions = useCallback((sessionIds: string[]) => {
    const gone = new Set(sessionIds);
    setLogs((prev) => prev.map((l) => (l.sessionId && gone.has(l.sessionId) ? { ...l, sessionId: null } : l)));
  }, []);

  const detachLogs = useCallback((ids: string[], deleted: boolean) => {
    const gone = new Set(ids);
    if (deleted) for (const id of ids) knownIds.current?.delete(id);
    setLogs((prev) =>
      deleted
        ? prev.filter((l) => !gone.has(l.id))
        : prev.map((l) => (gone.has(l.id) ? { ...l, sessionId: null } : l)),
    );
  }, []);

  const setLogShared = useCallback(async (id: string, shared: boolean) => {
    const updated = shared ? await logService.share(id) : await logService.unshare(id);
    setLogs((prev) => prev.map((l) => (l.id === id ? updated : l)));
  }, []);

  useEffect(() => {
    setLogs([]);
    setError(null);
    knownIds.current = null;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    refresh();
  }, [user?.id, refresh]);
  usePolling(refresh, !!user);

  // Layout shows a full-screen spinner until both the user and their logs are known.
  const value = useMemo(
    () => ({
      logs,
      loading: authLoading || loading,
      error,
      freshIds,
      refresh,
      remove,
      removeMany,
      setLogShared,
      detachSessions,
      detachLogs,
    }),
    [logs, authLoading, loading, error, freshIds, refresh, remove, removeMany, setLogShared, detachSessions, detachLogs],
  );
  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}

export function useLogs() {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error("useLogs must be used inside <LogsProvider>");
  return ctx;
}
