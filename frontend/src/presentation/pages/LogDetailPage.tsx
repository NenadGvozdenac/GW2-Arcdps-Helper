import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon, FlagIcon, Trash2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { profileService } from "../../services/profileService";
import type { Category } from "../../domain/types/encounter.types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import ResultBadge from "../components/ResultBadge";
import StatCard from "../components/StatCard";
import { LogDetailSkeleton } from "../components/Skeletons";
import { describeError } from "../utils/describeError";
import { professionColor } from "../utils/professionColors";

const CATEGORY_PATH: Record<Category, string> = {
  raid: "/raids",
  fractal: "/fractals",
  strike: "/strikes",
  other: "/logs",
};

function useLogDetailController(id: string | undefined) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { logs, loading, remove: removeLog } = useLogs();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const log = logs.find((l) => l.id === id) ?? null;
  const group = encounterService.groupById(log?.groupId ?? null);

  const backLink = log
    ? {
        to: CATEGORY_PATH[log.category] + (log.encounterKey ? `?boss=${log.encounterKey}` : ""),
        label: group ? `${group.short} — ${group.name}` : null,
      }
    : { to: "/logs", label: null };

  const totals = log
    ? {
        squadDps: log.players.reduce((s, p) => s + p.dps, 0),
        downs: log.players.reduce((s, p) => s + p.downs, 0),
        deaths: log.players.reduce((s, p) => s + p.deaths, 0),
        topDps: log.players[0]?.dps || 1,
        hasSubgroups: new Set(log.players.map((p) => p.group)).size > 1,
      }
    : null;

  async function remove() {
    if (!log) return;
    setDeleting(true);
    setError(null);
    const target = CATEGORY_PATH[log.category];
    try {
      await removeLog(log.id);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err);
      setDeleting(false);
    }
  }

  return {
    loading,
    log,
    backLink,
    totals,
    deleting,
    error,
    remove,
    isOwnAccount: (account: string) => profileService.isOwnAccount(user, account),
  };
}

export default function LogDetailPage() {
  const { id } = useParams();
  const { loading, log, backLink, totals, deleting, error, remove, isOwnAccount } = useLogDetailController(id);
  const { t, fmt } = useI18n();

  if (loading) return <LogDetailSkeleton />;
  if (!log || !totals) {
    return (
      <div className="flex flex-col items-start gap-4">
        <h1 className="text-2xl font-semibold">{t("logDetail.notFound")}</h1>
        <Button asChild variant="outline">
          <Link to="/logs">
            <ArrowLeftIcon /> {t("logDetail.backToLogs")}
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="self-start">
        <Link to={backLink.to}>
          <ArrowLeftIcon /> {backLink.label ?? t("logDetail.allLogs")}
        </Link>
      </Button>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          {log.bossIcon && <img src={log.bossIcon} alt="" className="size-16 rounded-lg" />}
          <div className="min-w-48 flex-1 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{log.bossName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ResultBadge log={log} />
              <span>{fmt.dateTime(log.encounterTime)}</span>
              {log.recordedBy && <span>{t("logDetail.recordedBy", { name: log.recordedBy })}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <a href={log.url} target="_blank" rel="noreferrer">
                dps.report <ExternalLinkIcon />
              </a>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive" disabled={deleting}>
                  <Trash2Icon /> {t("common.delete")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("logDetail.confirmDelete")}</AlertDialogTitle>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={remove}>
                    {t("common.delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(error, t)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("logDetail.duration")} value={fmt.duration(log.durationMs)} mono />
        <StatCard label={t("logDetail.squadDps")} value={fmt.number(totals.squadDps)} />
        <StatCard label={t("logDetail.downs")} value={totals.downs} />
        <StatCard label={t("logDetail.deaths")} value={totals.deaths} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("logDetail.players")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>{t("logDetail.colCharacter")}</TableHead>
                <TableHead>{t("logDetail.colAccount")}</TableHead>
                <TableHead>{t("logDetail.colSpec")}</TableHead>
                {totals.hasSubgroups && <TableHead className="text-right">{t("logDetail.colGroup")}</TableHead>}
                <TableHead className="text-right">{t("logDetail.colBossDps")}</TableHead>
                <TableHead className="text-right">{t("logDetail.colTotalDps")}</TableHead>
                <TableHead className="text-right">{t("logDetail.colDowns")}</TableHead>
                <TableHead className="text-right">{t("logDetail.colDeaths")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.players.map((p, i) => (
                <TableRow key={p.account + p.name} className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-1.5">
                      {p.commander && <FlagIcon className="size-3.5 text-warning" aria-label={t("logDetail.commander")} />}
                      {p.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.account}</TableCell>
                  <TableCell>
                    <span className="font-medium" style={{ color: professionColor(p.profession) }}>
                      {p.profession || "—"}
                    </span>
                  </TableCell>
                  {totals.hasSubgroups && <TableCell className="text-right text-muted-foreground">{p.group}</TableCell>}
                  <TableCell className="text-right">
                    <div className="relative ml-auto h-6 min-w-32 overflow-hidden rounded bg-muted">
                      <div
                        className="absolute inset-y-0 left-0 opacity-40"
                        style={{ width: `${(p.dps / totals.topDps) * 100}%`, background: professionColor(p.profession) }}
                      />
                      <span className="relative px-2 font-mono text-xs leading-6 font-semibold tabular-nums">
                        {fmt.number(p.dps)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground tabular-nums">{fmt.number(p.totalDps)}</TableCell>
                  <TableCell className="text-right">{p.downs || ""}</TableCell>
                  <TableCell className="text-right">{p.deaths || ""}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {t("logDetail.footer", {
          build: log.gw2Build ?? "?",
          ei: log.eliteInsightsVersion ?? "?",
          trigger: log.triggerId ?? "?",
        })}
      </p>
    </div>
  );
}
