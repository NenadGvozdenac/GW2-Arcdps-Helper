import { useMemo, useState } from "react";
import { SearchIcon } from "lucide-react";
import { LOGS_PAGE_SIZE } from "../../config/constants";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { logService } from "../../services/logService";
import { GROUPS } from "../../domain/data/encounters";
import type { LogFilter } from "../../domain/types/log.types";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "@/presentation/components/ui/skeleton";
import { LogTableSkeleton } from "../components/Skeletons";

const INITIAL_FILTER: LogFilter = { search: "", category: "all", groupId: "all", result: "all" };

function useAllLogsController() {
  const { logs, loading } = useLogs();
  const [filter, setFilter] = useState<LogFilter>(INITIAL_FILTER);
  const [limit, setLimit] = useState(LOGS_PAGE_SIZE);

  const filtered = useMemo(() => logService.filter(logs, filter), [logs, filter]);
  const groupOptions = filter.category === "all" ? GROUPS : encounterService.groupsFor(filter.category);

  function updateFilter(patch: Partial<LogFilter>) {
    setFilter((f) => ({
      ...f,
      ...patch,
      // Changing category invalidates the selected group.
      ...(patch.category && patch.category !== f.category ? { groupId: "all" } : {}),
    }));
    setLimit(LOGS_PAGE_SIZE);
  }

  return {
    loading,
    filter,
    updateFilter,
    groupOptions,
    total: filtered.length,
    visible: filtered.slice(0, limit),
    remaining: Math.max(0, filtered.length - limit),
    loadMore: () => setLimit((n) => n + LOGS_PAGE_SIZE),
  };
}

export default function AllLogsPage() {
  const c = useAllLogsController();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("allLogs.title")}
        description={c.loading ? <Skeleton className="h-4 w-24" /> : t("allLogs.count", { count: c.total })}
      />

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
        <Select value={c.filter.category} onValueChange={(v) => c.updateFilter({ category: v as LogFilter["category"] })}>
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
          {c.loading ? <LogTableSkeleton rows={10} /> : <LogTable logs={c.visible} showGroup />}
          {c.remaining > 0 && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" onClick={c.loadMore}>
                {t("common.loadMore", { count: c.remaining })}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
