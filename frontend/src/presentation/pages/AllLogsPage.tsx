import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlertCircleIcon, CheckIcon, ListChecksIcon, Loader2Icon, SearchIcon, Trash2Icon, XIcon } from "lucide-react";
import { LOGS_PAGE_SIZE_OPTIONS, SEARCH_DEBOUNCE_MS } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { logService } from "../../services/logService";
import { GROUPS } from "../../domain/data/encounters";
import type { LogFilter, LogPage } from "../../domain/types/log.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { cn } from "@/presentation/lib/utils";
import { useChartFormat } from "../components/charts/Charts";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { describeError } from "../utils/describeError";

const INITIAL_FILTER: LogFilter = { search: "", category: "all", groupId: "all", result: "all", day: "", boss: "" };

/** Fetches one page at a time from the server; re-fetches when the filter or page changes, or logs come and go. */
function useLogPage(filter: LogFilter, page: number, pageSize: number) {
  const { logs } = useLogs();
  const [result, setResult] = useState<LogPage>({ logs: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState(filter.search);
  const latest = useRef(0);

  // Typing in the search box waits for a pause before asking the server.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(filter.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [filter.search]);

  // The shared list is polled, so a change in its size means logs were added or deleted.
  const logCount = logs.length;
  useEffect(() => {
    const request = ++latest.current;
    setLoading(true);
    logService
      .search({ ...filter, search }, page, pageSize)
      .then((next) => {
        if (request !== latest.current) return;
        setResult(next);
        setError(null);
      })
      .catch((err) => request === latest.current && setError(err))
      .finally(() => request === latest.current && setLoading(false));
    // filter.search is left out on purpose: it reaches the server through the debounced `search`.
  }, [filter.category, filter.groupId, filter.result, filter.day, filter.boss, search, page, pageSize, logCount]);

  return { ...result, loading, error };
}

function useAllLogsController() {
  const { removeMany } = useLogs();
  // ?day= and ?boss= come from the dashboard's charts; removing the filter removes it from the address too.
  const [params, setParams] = useSearchParams();
  const urlDay = /^\d{4}-\d{2}-\d{2}$/.test(params.get("day") ?? "") ? params.get("day")! : "";
  const urlBoss = params.get("boss") ?? "";
  const [filter, setFilter] = useState<LogFilter>({ ...INITIAL_FILTER, day: urlDay, boss: urlBoss });
  useEffect(() => {
    setFilter((f) => (f.day === urlDay && f.boss === urlBoss ? f : { ...f, day: urlDay, boss: urlBoss }));
    setPage(1);
  }, [urlDay, urlBoss]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(logService.savedPageSize);
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const result = useLogPage(filter, page, pageSize);
  const lastPage = Math.max(1, Math.ceil(result.total / pageSize));
  // Deleting can leave you past the last page — step back to it.
  useEffect(() => {
    if (!result.loading && page > lastPage) setPage(lastPage);
  }, [result.loading, page, lastPage]);

  const groupOptions = filter.category === "all" ? GROUPS : encounterService.groupsFor(filter.category);

  function updateFilter(patch: Partial<LogFilter>) {
    setFilter((f) => ({
      ...f,
      ...patch,
      // Changing category invalidates the selected group.
      ...(patch.category && patch.category !== f.category ? { groupId: "all" } : {}),
    }));
    setPage(1);
    // Only logs you can see stay selected, so a delete never hits hidden ones.
    setSelected(new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** "Select all" covers every log matching the filters, also the ones on other pages. */
  async function toggleAll() {
    if (selected.size && selected.size === result.total) {
      setSelected(new Set());
      return;
    }
    setSelectingAll(true);
    setError(null);
    try {
      setSelected(new Set(await logService.searchIds(filter)));
    } catch (err) {
      setError(err);
    } finally {
      setSelectingAll(false);
    }
  }

  async function deleteSelected() {
    setDeleting(true);
    setError(null);
    try {
      await removeMany([...selected]);
      setSelected(new Set());
    } catch (err) {
      setError(err);
    } finally {
      setDeleting(false);
    }
  }

  /** Removes the dashboard's day or boss filter (from the address, which updates the filter). */
  function clearUrlFilter(key: "day" | "boss") {
    const next = new URLSearchParams(params);
    next.delete(key);
    setParams(next, { replace: true });
    setSelected(new Set());
  }

  return {
    filter,
    updateFilter,
    clearUrlFilter,
    groupOptions,
    total: result.total,
    page,
    pageSize,
    /** Keeps the first log you were looking at on screen. */
    changePageSize: (size: number) => {
      setPage(Math.floor(((page - 1) * pageSize) / size) + 1);
      setPageSize(size);
      logService.savePageSize(size);
    },
    visible: result.logs,
    loading: result.loading,
    setPage: (p: number) => {
      setPage(p);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    organizing,
    selected,
    deleting,
    error: error ?? result.error,
    toggle,
    deleteSelected,
    allSelected: result.total > 0 && selected.size === result.total,
    selectingAll,
    toggleAll,
    startOrganizing: () => setOrganizing(true),
    stopOrganizing: () => {
      setOrganizing(false);
      setSelected(new Set());
    },
  };
}

export default function AllLogsPage() {
  const c = useAllLogsController();
  const { t } = useI18n();
  const chartFormat = useChartFormat();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("allLogs.title")}
        description={t("allLogs.count", { count: c.total })}
        actions={
          c.organizing ? (
            <div className="flex flex-wrap items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive" disabled={!c.selected.size || c.deleting}>
                    {c.deleting ? <Loader2Icon className="animate-spin" /> : <Trash2Icon />}
                    {t("allLogs.deleteSelected", { count: c.selected.size })}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("allLogs.confirmDeleteMany", { count: c.selected.size })}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={c.deleteSelected}>
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={c.stopOrganizing}>
                <CheckIcon /> {t("sessions.done")}
              </Button>
            </div>
          ) : (
            c.total > 0 && (
              <Button variant="outline" onClick={c.startOrganizing}>
                <ListChecksIcon /> {t("sessions.organize")}
              </Button>
            )
          )
        }
      />

      {c.organizing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <Checkbox checked={c.allSelected} onCheckedChange={c.toggleAll} disabled={c.selectingAll} />
            {t("allLogs.selectAll", { count: c.total })}
          </label>
          <span className="text-muted-foreground">{t("allLogs.organizeHint")}</span>
        </div>
      )}

      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder={t("allLogs.searchPlaceholder")}
            value={c.filter.search}
            onChange={(e) => c.updateFilter({ search: e.target.value })}
          />
        </div>
        <Select
          value={c.filter.category}
          onValueChange={(v) => c.updateFilter({ category: v as LogFilter["category"] })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allLogs.allCategories")}</SelectItem>
            <SelectItem value="raid">{t("allLogs.categoryRaid")}</SelectItem>
            <SelectItem value="fractal">{t("allLogs.categoryFractal")}</SelectItem>
            <SelectItem value="strike">{t("allLogs.categoryStrike")}</SelectItem>
            <SelectItem value="other">{t("allLogs.categoryOther")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={c.filter.groupId} onValueChange={(v) => c.updateFilter({ groupId: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allLogs.allGroups")}</SelectItem>
            {c.groupOptions.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.short} — {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={c.filter.result} onValueChange={(v) => c.updateFilter({ result: v as LogFilter["result"] })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allLogs.resultAll")}</SelectItem>
            <SelectItem value="kill">{t("allLogs.resultKill")}</SelectItem>
            <SelectItem value="wipe">{t("allLogs.resultWipe")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(c.filter.day || c.filter.boss) && (
        <div className="flex flex-wrap gap-2">
          {c.filter.day && (
            <Button variant="secondary" size="sm" onClick={() => c.clearUrlFilter("day")} aria-label={t("allLogs.removeFilter")}>
              {t("allLogs.filterDay", { day: chartFormat.day(c.filter.day, true) })} <XIcon />
            </Button>
          )}
          {c.filter.boss && (
            <Button variant="secondary" size="sm" onClick={() => c.clearUrlFilter("boss")} aria-label={t("allLogs.removeFilter")}>
              {t("allLogs.filterBoss", { boss: c.filter.boss })} <XIcon />
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="relative" aria-busy={c.loading}>
          {c.loading && c.visible.length === 0 ? (
            // First load (or a filter with nothing shown yet): a spinner instead of "No logs".
            <div className="grid place-items-center py-16" role="status">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className={cn("transition-opacity", c.loading && "opacity-50")}>
              <LogTable
                logs={c.visible}
                showGroup
                selection={c.organizing ? { selected: c.selected, onToggle: c.toggle } : undefined}
              />
            </div>
          )}
          {c.loading && c.visible.length > 0 && (
            // Next page / new filter: the current rows stay visible, dimmed, under a spinner.
            <div className="pointer-events-none absolute inset-0 grid place-items-center" role="status">
              <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
            </div>
          )}
          <div className="mt-4">
            <Pagination
              page={c.page}
              pageSize={c.pageSize}
              total={c.total}
              onPageChange={c.setPage}
              pageSizes={{ options: LOGS_PAGE_SIZE_OPTIONS, onChange: c.changePageSize }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
