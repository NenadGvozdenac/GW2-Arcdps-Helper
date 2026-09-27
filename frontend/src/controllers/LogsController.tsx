import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { FRESH_HIGHLIGHT_MS, POLL_INTERVAL_MS } from "../config/constants";
import { logService } from "../services/logService";
import type { Log } from "../domain/types/log.types";
import { useAuth } from "./AuthController";

interface LogsContextValue {
  logs: Log[];
  loading: boolean;
  /** Raw error from the last load; the presentation layer turns it into a message. */
  error: unknown;
  /** Ids of logs that appeared in the last refresh (for highlighting). */
  freshIds: ReadonlySet<string>;
  refresh: () => Promise<void>;
  remove: (id: string) => Promise<void>;
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

  // Pages show their skeleton until both the user and their logs are known.
  const value = useMemo(
    () => ({ logs, loading: authLoading || loading, error, freshIds, refresh, remove }),
    [logs, authLoading, loading, error, freshIds, refresh, remove],
  );
  return <LogsContext.Provider value={value}>{children}</LogsContext.Provider>;
}

export function useLogs() {
  const ctx = useContext(LogsContext);
  if (!ctx) throw new Error("useLogs must be used inside <LogsProvider>");
  return ctx;
}
