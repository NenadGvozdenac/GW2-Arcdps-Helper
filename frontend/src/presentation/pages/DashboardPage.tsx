import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircleIcon, ArrowRightIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { statsService } from "../../services/statsService";
import { dashboardChartsStorage } from "../../storage/dashboardChartsStorage";
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

/** The periods the dashboard's charts can show (like the admin overview), and the default. */
const CHART_PERIODS = [7, 30, 90] as const;
type ChartDays = (typeof CHART_PERIODS)[number];
const DEFAULT_CHART_DAYS: ChartDays = 30;
const DAY_MS = 24 * 60 * 60_000;
const TOP_BOSSES = 8;

const SECTIONS: { category: Exclude<Category, "other">; label: TranslationKey; to: string }[] = [
  { category: "raid", label: "nav.raids", to: "/raids" },
  { category: "fractal", label: "nav.fractals", to: "/fractals" },
  { category: "strike", label: "nav.strikes", to: "/strikes" },
];

/**
 * The last `chartDays` UTC days: kills and wipes and minutes in fights per day, the bosses fought most and the ones
 * wiped on most.
 */
function recentActivity(logs: Log[], chartDays: ChartDays) {
  const todayStart = Date.parse(new Date().toISOString().slice(0, 10));
  const from = todayStart - (chartDays - 1) * DAY_MS;
  const days = new Map<string, { kills: number; wipes: number; fightMs: number }>();
  for (let i = 0; i < chartDays; i++) {
    days.set(new Date(from + i * DAY_MS).toISOString().slice(0, 10), { kills: 0, wipes: 0, fightMs: 0 });
  }
  const bosses = new Map<string, { logs: number; kills: number }>();
  for (const l of logs) {
    if (l.encounterTime.getTime() < from) continue;
    const day = days.get(l.encounterTime.toISOString().slice(0, 10));
    if (day) {
      day[l.success ? "kills" : "wipes"]++;
      day.fightMs += l.durationMs;
    }
    const boss = bosses.get(l.bossName) ?? { logs: 0, kills: 0 };
    boss.logs++;
    if (l.success) boss.kills++;
    bosses.set(l.bossName, boss);
  }
  const bossRows = [...bosses].map(([name, b]) => ({ name, ...b, wipes: b.logs - b.kills }));
  return {
    perDay: [...days].map(([date, d]) => ({ date, values: [d.kills, d.wipes] })),
    fightMinutesPerDay: [...days].map(([date, d]) => ({ date, values: [Math.round(d.fightMs / 60_000)] })),
    topBosses: [...bossRows].sort((a, b) => b.logs - a.logs || a.name.localeCompare(b.name)).slice(0, TOP_BOSSES),
    mostWiped: bossRows
      .filter((b) => b.wipes > 0)
      .sort((a, b) => b.wipes - a.wipes || a.name.localeCompare(b.name))
      .slice(0, TOP_BOSSES),
  };
}

function useDashboardController() {
  const { accountLabel } = useAuth();
  const { logs, error } = useLogs();
  // Collapsing the charts is remembered in this browser; their period is in the address (?days=), so a link keeps it.
  const [chartsCollapsed, setChartsCollapsed] = useState(dashboardChartsStorage.getCollapsed);
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("days"));
  const chartDays: ChartDays = CHART_PERIODS.includes(requested as ChartDays)
    ? (requested as ChartDays)
    : DEFAULT_CHART_DAYS;
  const toggleCharts = () => {
    dashboardChartsStorage.setCollapsed(!chartsCollapsed);
    setChartsCollapsed(!chartsCollapsed);
  };

  const data = useMemo(() => {
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
      activity: recentActivity(logs, chartDays),
    };
  }, [logs, error, accountLabel, chartDays]);

  return {
    ...data,
    chartsCollapsed,
    toggleCharts,
    chartDays,
    setChartDays: (days: ChartDays) => setParams({ days: String(days) }, { replace: true }),
  };
}

export default function DashboardPage() {
  const {
    accountLabel,
    error,
    totals,
    clearCards,
    today,
    activity,
    chartsCollapsed,
    toggleCharts,
    chartDays,
    setChartDays,
  } = useDashboardController();
  const { t } = useI18n();
  const navigate = useNavigate();

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

      {/* Wide screens: the overview on the left, today's logs on the right; stacked, today's logs come last. */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={t("dashboard.totalLogs")} value={totals.logs} />
            <StatCard label={t("dashboard.kills")} value={totals.kills} tone="success" />
            <StatCard label={t("dashboard.wipes")} value={totals.wipes} tone="fail" />
            <StatCard label={t("dashboard.logsThisWeek")} value={totals.thisWeek} />
          </div>

          {/* The three clears side by side, cards of one height (stacked on a phone). */}
          <div className="grid gap-4 lg:grid-cols-3">
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

          {/* The last 7 / 30 / 90 days, collapsible (remembered in this browser). */}
          <section className="flex flex-col gap-4" aria-labelledby="dashboard-charts">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="dashboard-charts" className="text-lg font-semibold">
                {t("dashboard.chartsHeading", { days: chartDays })}
              </h2>
              <div className="flex flex-wrap items-center gap-1">
                {CHART_PERIODS.map((d) => (
                  <Button
                    key={d}
                    size="sm"
                    variant={chartDays === d ? "secondary" : "ghost"}
                    aria-pressed={chartDays === d}
                    onClick={() => setChartDays(d)}
                  >
                    {t("dashboard.lastDays", { days: d })}
                  </Button>
                ))}
                <span aria-hidden className="mx-1 h-5 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleCharts}
                  aria-expanded={!chartsCollapsed}
                  aria-controls="dashboard-charts-body"
                >
                  {chartsCollapsed ? <ChevronDownIcon /> : <ChevronUpIcon />}
                  {chartsCollapsed ? t("dashboard.showCharts") : t("dashboard.hideCharts")}
                </Button>
              </div>
            </div>
            {!chartsCollapsed && (
              <div id="dashboard-charts-body" className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dashboard.activityTitle")}</CardTitle>
                    <CardDescription>{t("dashboard.activityHint", { days: chartDays })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TimeChart
                      kind="columns"
                      label={t("dashboard.activityTitle")}
                      data={activity.perDay}
                      onSelect={(day) => navigate(`/logs?day=${day}`)}
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
                    <CardDescription>{t("dashboard.bossesHint", { days: chartDays })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarList
                      onSelect={(boss) => navigate(`/logs?boss=${encodeURIComponent(boss)}`)}
                      rows={activity.topBosses.map((b) => ({
                        key: b.name,
                        label: b.name,
                        value: b.logs,
                        detail: t("dashboard.bossKills", { count: b.kills }),
                      }))}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dashboard.fightTimeTitle")}</CardTitle>
                    <CardDescription>{t("dashboard.fightTimeHint")}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TimeChart
                      kind="line"
                      label={t("dashboard.fightTimeTitle")}
                      data={activity.fightMinutesPerDay}
                      onSelect={(day) => navigate(`/logs?day=${day}`)}
                      series={[{ name: t("dashboard.fightMinutes"), color: SERIES.s3 }]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t("dashboard.wipedTitle")}</CardTitle>
                    <CardDescription>{t("dashboard.wipedHint", { days: chartDays })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <BarList
                      color={SERIES.s2}
                      empty={t("dashboard.noWipes", { days: chartDays })}
                      onSelect={(boss) => navigate(`/logs?boss=${encodeURIComponent(boss)}`)}
                      rows={activity.mostWiped.map((b) => ({
                        key: b.name,
                        label: b.name,
                        value: b.wipes,
                        detail: t("dashboard.bossKills", { count: b.kills }),
                      }))}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </section>
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
    </div>
  );
}
