import { useCallback, useEffect, useRef, useState } from "react";
import { ADMIN_PAGE_SIZE } from "../config/constants";
import { useAdmin } from "../controllers/AdminController";
import type { AdminListQuery, AdminPage } from "../domain/types/admin.types";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * One admin list: search (debounced), page, and filters fixed by the caller (`userId` / `sessionId`). `reload` fetches
 * the current page again after an action; a stale answer (the query changed meanwhile) is dropped.
 */
export function useAdminList<T>(
  load: (q: AdminListQuery) => Promise<AdminPage<T>>,
  filters: { userId?: string; sessionId?: string } = {},
) {
  const { handleError } = useAdmin();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminPage<T>>({ rows: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const { userId, sessionId } = filters;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => setPage(1), [userId, sessionId]);

  const reload = useCallback(async () => {
    const request = ++latest.current;
    setLoading(true);
    try {
      const next = await load({ search, page, userId, sessionId });
      if (request !== latest.current) return;
      setData(next);
      setError(null);
    } catch (err) {
      if (request === latest.current) setError(handleError(err));
    } finally {
      if (request === latest.current) setLoading(false);
    }
  }, [load, search, page, userId, sessionId, handleError]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Deleting can leave the page past the last one: step back.
  const lastPage = Math.max(1, Math.ceil(data.total / ADMIN_PAGE_SIZE));
  useEffect(() => {
    if (!loading && page > lastPage) setPage(lastPage);
  }, [loading, page, lastPage]);

  return { searchInput, setSearchInput, page, setPage, ...data, loading, error, setError, reload };
}
