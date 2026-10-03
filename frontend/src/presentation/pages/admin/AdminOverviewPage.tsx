import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdmin } from "../../../controllers/AdminController";
import type { AdminOverview, AdminStats, AdminStatsDays } from "../../../domain/types/admin.types";
import { adminService } from "../../../services/adminService";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import { ErrorAlert, InlineSpinner, LoadingBlock, rateLimitKindLabel } from "../../components/admin/AdminKit";
import { StatTile } from "../../components/admin/AdminCharts";
import { BarList, SERIES, TimeChart, type ChartPoint, type ChartSeries } from "../../components/charts/Charts";
import PageHeader from "../../components/PageHeader";

const PERIODS: AdminStatsDays[] = [7, 30, 90];
const CATEGORY_LABELS: Record<string, string> = { raid: "Raids", fractal: "Fractals", strike: "Strikes", other: "Other" };
const formatNumber = (n: number) => n.toLocaleString("en-GB");

/** The period comes from ?days= (so a link keeps it); the previous answer stays on screen, dimmed, while a new one loads. */
function useOverviewController() {
  const { handleError } = useAdmin();
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get("days"));
  const days: AdminStatsDays = PERIODS.includes(requested as AdminStatsDays) ? (requested as AdminStatsDays) : 30;
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    adminService.overview().then(setOverview, (err) => setError(handleError(err)));
  }, [handleError]);

  useEffect(() => {
    const request = ++latest.current;
    setLoading(true);
    adminService
      .stats(days)
      .then((s) => request === latest.current && setStats(s))
      .catch((err) => request === latest.current && setError(handleError(err)))
      .finally(() => request === latest.current && setLoading(false));
  }, [days, handleError]);

  return { days, setDays: (d: AdminStatsDays) => setParams({ days: String(d) }), stats, overview, loading, error };
}

/** Refused requests per day: the two most frequent kinds in the period, the rest folded into "Other". */
function refusedSeries(stats: AdminStats): { series: ChartSeries[]; data: ChartPoint[] } {
  const totals = new Map<string, number>();
  for (const d of stats.daily) for (const [kind, n] of Object.entries(d.refused)) totals.set(kind, (totals.get(kind) ?? 0) + n);
  const kinds = [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  const shown = kinds.slice(0, 2);
  const hasOther = kinds.length > 2;
  const series: ChartSeries[] = [
    ...shown.map((k, i) => ({ name: rateLimitKindLabel(k), color: i === 0 ? SERIES.s1 : SERIES.s2 })),
    ...(hasOther ? [{ name: "Other", color: SERIES.other }] : []),
  ];
  const data = stats.daily.map((d) => {
    const values = shown.map((k) => d.refused[k] ?? 0);
    if (hasOther) values.push(Object.entries(d.refused).reduce((sum, [k, n]) => (shown.includes(k) ? sum : sum + n), 0));
    return { date: d.date, values };
  });
  return { series: series.length ? series : [{ name: "Refused", color: SERIES.s1 }], data: series.length ? data : stats.daily.map((d) => ({ date: d.date, values: [0] })) };
}

function ChartCard({ title, description, children, className }: { title: string; description?: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const c = useOverviewController();
  const s = c.stats;
  const period = `${c.days} days`;

  const charts = useMemo(() => {
    if (!s) return null;
    return {
      logs: s.daily.map((d) => ({ date: d.date, values: [d.kills, d.wipes] })),
      active: s.daily.map((d) => ({ date: d.date, values: [d.activeUsers] })),
      newUsers: s.daily.map((d) => ({ date: d.date, values: [d.newUsers] })),
      sessions: s.daily.map((d) => ({ date: d.date, values: [d.sessions] })),
      refused: refusedSeries(s),
    };
  }, [s]);

  return (
    <>
      <PageHeader title="Overview" description="Activity across all accounts. Days are UTC." />

      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Period">
        {PERIODS.map((d) => (
          <Button key={d} size="sm" variant={c.days === d ? "secondary" : "ghost"} aria-pressed={c.days === d} onClick={() => c.setDays(d)}>
            Last {d} days
          </Button>
        ))}
        <span className="ml-2">
          <InlineSpinner show={c.loading && !!s} />
        </span>
      </div>

      <ErrorAlert message={c.error} />

      {!s && !c.error && <LoadingBlock />}

      {s && charts && (
        <div className={cn("flex flex-col gap-6 transition-opacity", c.loading && "opacity-60")}>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
            <StatTile label="Logs uploaded" value={formatNumber(s.totals.logs.now)} previous={s.totals.logs} period={period} />
            <StatTile label="Active users" value={formatNumber(s.totals.activeUsers.now)} previous={s.totals.activeUsers} period={period} />
            <StatTile label="New users" value={formatNumber(s.totals.newUsers.now)} previous={s.totals.newUsers} period={period} />
            <StatTile label="Sessions" value={formatNumber(s.totals.sessions.now)} previous={s.totals.sessions} period={period} />
            <StatTile
              label="Kill rate"
              value={s.totals.logs.now ? `${Math.round((s.totals.kills / s.totals.logs.now) * 100)}%` : "—"}
              detail={`${formatNumber(s.totals.kills)} kills of ${formatNumber(s.totals.logs.now)} logs`}
            />
            <StatTile
              label="Refused requests"
              value={formatNumber(s.totals.refused.now)}
              previous={s.totals.refused}
              upIsGood={false}
              period={period}
            />
          </div>

          <ChartCard title="Logs per day" description="Uploaded logs, kills and wipes.">
            <TimeChart
              kind="columns"
              label="Logs uploaded per day, kills and wipes"
              data={charts.logs}
              series={[
                { name: "Kills", color: SERIES.s1 },
                { name: "Wipes", color: SERIES.s2 },
              ]}
              height={240}
            />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Active users per day" description="Accounts that uploaded at least one log.">
              <TimeChart kind="line" label="Active users per day" data={charts.active} series={[{ name: "Active users", color: SERIES.s1 }]} />
            </ChartCard>
            <ChartCard title="New users per day" description="Registrations.">
              <TimeChart kind="line" label="New users per day" data={charts.newUsers} series={[{ name: "New users", color: SERIES.s1 }]} />
            </ChartCard>
            <ChartCard title="Sessions per day" description="Sessions started.">
              <TimeChart kind="columns" label="Sessions started per day" data={charts.sessions} series={[{ name: "Sessions", color: SERIES.s1 }]} />
            </ChartCard>
            <ChartCard title="Refused requests per day" description="Requests stopped by a rate limit.">
              <TimeChart kind="columns" label="Refused requests per day" data={charts.refused.data} series={charts.refused.series} />
            </ChartCard>
            <ChartCard title="Logs by content" description={`Last ${period}.`}>
              <BarList
                rows={s.byCategory.map((r) => ({
                  key: r.category,
                  label: CATEGORY_LABELS[r.category] ?? r.category,
                  value: r.logs,
                  detail: `${formatNumber(r.kills)} kills`,
                }))}
              />
            </ChartCard>
            <ChartCard title="Most logged bosses" description={`Last ${period}.`}>
              <BarList
                rows={s.topBosses.map((r) => ({ key: r.boss, label: r.boss, value: r.logs, detail: `${formatNumber(r.kills)} kills` }))}
              />
            </ChartCard>
          </div>

          <ChartCard title="Most active users" description={`By logs uploaded in the last ${period}.`}>
            {s.topUploaders.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>GW2 account</TableHead>
                    <TableHead className="text-right">Logs</TableHead>
                    <TableHead className="text-right">Sessions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.topUploaders.map((u) => (
                    <TableRow key={u.userId}>
                      <TableCell>
                        <Link to={`/admin/users/${u.userId}`} className="font-medium hover:underline">
                          {u.email}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.gw2Account || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(u.logs)}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatNumber(u.sessions)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">Nobody uploaded in this period.</p>
            )}
          </ChartCard>
        </div>
      )}

      {c.overview && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">All time</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { to: "/admin/users", value: c.overview.users, label: "Users", detail: `${c.overview.verifiedUsers} verified · ${c.overview.blockedUsers} blocked` },
              { to: "/admin/logs", value: c.overview.logs, label: "Logs" },
              { to: "/admin/sessions", value: c.overview.sessions, label: "Sessions", detail: `${c.overview.activeSessions} active` },
              { to: "/admin/webhooks", value: c.overview.webhooks, label: "Discord webhooks" },
              { to: "/admin/security", value: c.overview.blockedIps, label: "Blocked addresses" },
            ].map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className="flex flex-col rounded-lg border px-4 py-3 transition-colors hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <span className="text-xl font-semibold">{formatNumber(t.value)}</span>
                <span className="text-sm">{t.label}</span>
                {t.detail && <span className="text-xs text-muted-foreground">{t.detail}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
