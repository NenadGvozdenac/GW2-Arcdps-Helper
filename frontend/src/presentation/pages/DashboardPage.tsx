import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { statsService } from "../../services/statsService";
import type { Category } from "../../domain/types/encounter.types";
import type { Log } from "../../domain/types/log.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { BarList, SERIES, TimeChart } from "../components/charts/Charts";
import ClearCard from "../components/ClearCard";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import SetupTipCard from "../components/SetupTipCard";
import StatCard from "../components/StatCard";
import { describeError } from "../utils/describeError";

/** How far back the dashboard's charts look. */
const CHART_DAYS = 30;
const DAY_MS = 24 * 60 * 60_000;
const TOP_BOSSES = 8;

const SECTIONS: { category: Exclude<Category, "other">; label: TranslationKey; to: string }[] = [
  { category: "raid", label: "nav.raids", to: "/raids" },
  { category: "fractal", label: "nav.fractals", to: "/fractals" },
  { category: "strike", label: "nav.strikes", to: "/strikes" },
];

/** Kills and wipes per UTC day for the last CHART_DAYS days, and the bosses fought most in them. */
function recentActivity(logs: Log[]) {
  const todayStart = Date.parse(new Date().toISOString().slice(0, 10));
  const from = todayStart - (CHART_DAYS - 1) * DAY_MS;
  const days = new Map<string, { kills: number; wipes: number }>();
  for (let i = 0; i < CHART_DAYS; i++) days.set(new Date(from + i * DAY_MS).toISOString().slice(0, 10), { kills: 0, wipes: 0 });
  const bosses = new Map<string, { logs: number; kills: number }>();
  for (const l of logs) {
    if (l.encounterTime.getTime() < from) continue;
    const day = days.get(l.encounterTime.toISOString().slice(0, 10));
    if (day) day[l.success ? "kills" : "wipes"]++;
    const boss = bosses.get(l.bossName) ?? { logs: 0, kills: 0 };
    boss.logs++;
    if (l.success) boss.kills++;
    bosses.set(l.bossName, boss);
  }
  return {
    perDay: [...days].map(([date, d]) => ({ date, values: [d.kills, d.wipes] })),
    topBosses: [...bosses]
      .sort((a, b) => b[1].logs - a[1].logs || a[0].localeCompare(b[0]))
      .slice(0, TOP_BOSSES)
      .map(([name, b]) => ({ name, ...b })),
  };
}

function useDashboardController() {
  const { accountLabel } = useAuth();
  const { logs, error } = useLogs();

  return useMemo(() => {
    const weekly = statsService.lastWeeklyReset();
    const kills = logs.filter((l) => l.success).length;
    return {
      accountLabel,
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
      activity: recentActivity(logs),
    };
  }, [logs, error, accountLabel]);
}

export default function DashboardPage() {
  const { accountLabel, error, totals, clearCards, today, activity } = useDashboardController();
  const { t } = useI18n();


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("dashboard.greeting", { name: accountLabel || t("dashboard.fallbackName") })}
        description={t("dashboard.subtitle")}
      />

      <SetupTipCard />
      {error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{t("dashboard.loadError", { error: describeError(error, t) })}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("dashboard.totalLogs")} value={totals.logs} />
        <StatCard label={t("dashboard.kills")} value={totals.kills} tone="success" />
        <StatCard label={t("dashboard.wipes")} value={totals.wipes} tone="fail" />
        <StatCard label={t("dashboard.logsThisWeek")} value={totals.thisWeek} />
      </div>

      {/* Clears on the left, the last 30 days on the right (one column on a phone). */}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          {clearCards.map((c) => (
            <ClearCard key={c.category} label={t(c.label)} to={c.to} resetLabel={t(c.resetLabel)} progress={c.progress} />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.activityTitle")}</CardTitle>
              <CardDescription>{t("dashboard.activityHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <TimeChart
                kind="columns"
                label={t("dashboard.activityTitle")}
                data={activity.perDay}
                series={[
                  { name: t("dashboard.kills"), color: SERIES.s1 },
                  { name: t("dashboard.wipes"), color: SERIES.s2 },
                ]}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.bossesTitle")}</CardTitle>
              <CardDescription>{t("dashboard.bossesHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              <BarList
                rows={activity.topBosses.map((b) => ({
                  key: b.name,
                  label: b.name,
                  value: b.logs,
                  detail: t("dashboard.bossKills", { count: b.kills }),
                }))}
              />
            </CardContent>
          </Card>
        </div>
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
    </div>
  );
}
