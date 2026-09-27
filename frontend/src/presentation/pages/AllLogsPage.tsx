import { useMemo, useState } from "react";
import { AlertCircleIcon, CheckIcon, ListChecksIcon, Loader2Icon, SearchIcon, Trash2Icon } from "lucide-react";
import { LOGS_PAGE_SIZE } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { logService } from "../../services/logService";
import { GROUPS } from "../../domain/data/encounters";
import type { LogFilter } from "../../domain/types/log.types";
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
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import { describeError } from "../utils/describeError";

const INITIAL_FILTER: LogFilter = { search: "", category: "all", groupId: "all", result: "all" };

function useAllLogsController() {
  const { logs, removeMany } = useLogs();
  const [filter, setFilter] = useState<LogFilter>(INITIAL_FILTER);
  const [page, setPage] = useState(1);
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const filtered = useMemo(() => logService.filter(logs, filter), [logs, filter]);
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / LOGS_PAGE_SIZE)));
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

  return {
    filter,
    updateFilter,
    groupOptions,
    total: filtered.length,
    // Stays valid when deleting shrinks the list.
    page: currentPage,
    visible: filtered.slice((currentPage - 1) * LOGS_PAGE_SIZE, currentPage * LOGS_PAGE_SIZE),
    setPage: (p: number) => {
      setPage(p);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    organizing,
    selected,
    deleting,
    error,
    toggle,
    deleteSelected,
    /** "Select all" covers every log matching the filters, also the ones not loaded into the table yet. */
    allSelected: filtered.length > 0 && selected.size === filtered.length,
    toggleAll: () =>
      setSelected((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((l) => l.id)))),
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
            <Checkbox checked={c.allSelected} onCheckedChange={c.toggleAll} />
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

      <Card>
        <CardContent>
          <LogTable
            logs={c.visible}
            showGroup
            selection={c.organizing ? { selected: c.selected, onToggle: c.toggle } : undefined}
          />
          <div className="mt-4">
            <Pagination page={c.page} pageSize={LOGS_PAGE_SIZE} total={c.total} onPageChange={c.setPage} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
