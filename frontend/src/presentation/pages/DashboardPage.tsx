import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { statsService } from "../../services/statsService";
import type { Category } from "../../domain/types/encounter.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import ClearCard from "../components/ClearCard";
import { DashboardSkeleton } from "../components/Skeletons";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { describeError } from "../utils/describeError";

const SECTIONS: { category: Exclude<Category, "other">; label: TranslationKey; to: string }[] = [
  { category: "raid", label: "nav.raids", to: "/raids" },
  { category: "fractal", label: "nav.fractals", to: "/fractals" },
  { category: "strike", label: "nav.strikes", to: "/strikes" },
];

function useDashboardController() {
  const { accountLabel } = useAuth();
  const { logs, loading, error } = useLogs();

  return useMemo(() => {
    const weekly = statsService.lastWeeklyReset();
    const kills = logs.filter((l) => l.success).length;
    return {
      accountLabel,
      loading,
      error,
      totals: {
        logs: logs.length,
        kills,
        wipes: logs.length - kills,
        thisWeek: logs.filter((l) => l.encounterTime >= weekly).length,
      },
      clearCards: SECTIONS.map((s) => ({
        ...s,
        resetLabel: (s.category === "fractal" ? "dashboard.dailyClear" : "dashboard.weeklyClear") as TranslationKey,
        progress: statsService.clearProgress(logs, s.category, statsService.resetFor(s.category)),
      })),
      today: statsService.logsBetween(logs, statsService.lastDailyReset()),
    };
  }, [logs, loading, error, accountLabel]);
}

export default function DashboardPage() {
  const { accountLabel, loading, error, totals, clearCards, today } = useDashboardController();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("dashboard.greeting", { name: accountLabel || t("dashboard.fallbackName") })}
        description={t("dashboard.subtitle")}
      />

      {error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{t("dashboard.loadError", { error: describeError(error, t) })}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t("dashboard.totalLogs")} value={totals.logs} />
            <StatCard label={t("dashboard.kills")} value={totals.kills} tone="success" />
            <StatCard label={t("dashboard.wipes")} value={totals.wipes} tone="fail" />
            <StatCard label={t("dashboard.logsThisWeek")} value={totals.thisWeek} />
          </div>

          <div className="flex flex-col gap-4">
            {clearCards.map((c) => (
              <ClearCard
                key={c.category}
                label={t(c.label)}
                to={c.to}
                resetLabel={t(c.resetLabel)}
                progress={c.progress}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="space-y-1.5">
                <CardTitle>{t("dashboard.todayLogs")}</CardTitle>
                <CardDescription>{t("dashboard.todayLogsHint", { count: today.length })}</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link to="/logs">
                  {t("dashboard.allLogsLink")} <ArrowRightIcon />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <LogTable logs={today} showGroup />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
