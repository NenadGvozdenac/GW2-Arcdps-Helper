import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  CheckIcon,
  FileSpreadsheetIcon,
  HistoryIcon,
  ListChecksIcon,
  Loader2Icon,
  RotateCcwIcon,
  Trash2Icon,
  UnlinkIcon,
} from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useAuth } from "../../controllers/AuthController";
import { useLogs } from "../../controllers/LogsController";
import { useSessions } from "../../controllers/SessionsController";
import { sessionExportService } from "../../services/sessionExportService";
import { sessionService } from "../../services/sessionService";
import { localeFor } from "../../i18n/translate";
import type { LogDetail } from "../../domain/types/log.types";
import { Alert, AlertDescription, AlertTitle } from "@/presentation/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import GroupedLogTable, { SessionResultFilterToggle, useSessionResultFilter } from "../components/GroupedLogTable";
import PracticeRunCard from "../components/PracticeRunCard";
import SessionTitle from "../components/SessionTitle";
import ShareButton from "../components/ShareButton";
import PageHeader from "../components/PageHeader";
import { successBadge } from "../components/ResultBadge";
import StatCard from "../components/StatCard";
import { describeError } from "../utils/describeError";

function useSessionDetailController(id: string | undefined) {
  const { logs } = useLogs();
  const { sessions, removeSession, removeSessionLogs, resumeSession, setSessionShared } = useSessions();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const { t, lang } = useI18n();

  const { user } = useAuth();
  const view = useMemo(() => {
    const session = sessions.find((s) => s.id === id);
    return session ? sessionService.views([session], logs)[0] : null;
  }, [sessions, logs, id]);
  // Only a session of training golems gets the practice summary; that needs the squads, so load them just then.
  const isPractice = !!view && sessionService.isPractice(view.logs);
  const logCount = view?.logs.length ?? 0;
  const [squadLogs, setSquadLogs] = useState<LogDetail[] | null>(null);
  useEffect(() => {
    if (!isPractice || !id) return setSquadLogs(null);
    let cancelled = false;
    sessionService
      .logsWithSquads(id)
      .then((logs) => !cancelled && setSquadLogs(logs))
      .catch(() => !cancelled && setSquadLogs(null));
    return () => {
      cancelled = true;
    };
  }, [isPractice, id, logCount]);
  const practice = useMemo(
    () => (squadLogs ? sessionService.practiceRun(squadLogs, user?.gw2Account ?? "") : null),
    [squadLogs, user?.gw2Account],
  );

  async function remove() {
    if (!view) return;
    setDeleting(true);
    setError(null);
    try {
      await removeSession(view.session.id);
      navigate("/sessions");
    } catch (err) {
      setError(err);
      setDeleting(false);
    }
  }

  // Taking logs out of an ended session: pick them in the table, then confirm (optionally deleting them too).
  const [organizing, setOrganizing] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [alsoDelete, setAlsoDelete] = useState(false);
  const [removing, setRemoving] = useState(false);

  function toggle(logId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) next.delete(logId);
      else next.add(logId);
      return next;
    });
  }

  const allSelected = logCount > 0 && selected.size === logCount;
  const toggleAll = () => setSelected(allSelected || !view ? new Set() : new Set(view.logs.map((l) => l.id)));

  function stopOrganizing() {
    setOrganizing(false);
    setSelected(new Set());
  }

  async function removeSelected() {
    if (!view) return;
    setRemoving(true);
    setError(null);
    try {
      await removeSessionLogs(view.session.id, [...selected], alsoDelete);
      setSelected(new Set());
      if (selected.size === logCount) setOrganizing(false);
    } catch (err) {
      setError(err);
    } finally {
      setRemoving(false);
    }
  }

  async function resume() {
    if (!view) return;
    setResuming(true);
    setError(null);
    try {
      await resumeSession(view.session.id);
    } catch (err) {
      setError(err);
    } finally {
      setResuming(false);
    }
  }

  async function exportExcel() {
    if (!view) return;
    setExporting(true);
    setError(null);
    try {
      await sessionExportService.export(view.session, t, localeFor(lang));
    } catch (err) {
      setError(err);
    } finally {
      setExporting(false);
    }
  }

  return {
    setError,
    exporting,
    exportExcel,
    setShared: (shared: boolean) => (view ? setSessionShared(view.session.id, shared) : Promise.resolve()),
    practice,
    view,
    deleting,
    resuming,
    error,
    remove,
    resume,
    organizing,
    selected,
    toggle,
    allSelected,
    toggleAll,
    startOrganizing: () => setOrganizing(true),
    stopOrganizing,
    alsoDelete,
    setAlsoDelete,
    removing,
    removeSelected,
  };
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const c = useSessionDetailController(id);
  const { t, fmt } = useI18n();
  const resultFilter = useSessionResultFilter();

  const back = (
    <Button asChild variant="ghost" size="sm" className="self-start">
      <Link to="/sessions">
        <ArrowLeftIcon /> {t("sessions.back")}
      </Link>
    </Button>
  );

  if (!c.view) {
    return (
      <div className="flex flex-col items-start gap-4">
        {back}
        <h1 className="text-2xl font-semibold">{t("sessions.notFound")}</h1>
      </div>
    );
  }

  const { session, logs, span, kills, wipes, groups } = c.view;

  return (
    <div className="flex flex-col gap-6">
      {back}

      <PageHeader
        title={<SessionTitle session={session} onError={c.setError} />}
        description={
          <div className="flex flex-wrap items-center gap-2">
            {!session.endedAt && (
              <Badge variant="outline" className={successBadge}>
                {t("sessions.active")}
              </Badge>
            )}
            <span>
              {span ? `${fmt.dateTime(span.start)} – ${fmt.dateTime(span.end)}` : fmt.dateTime(session.startedAt)}
            </span>
            {groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="font-mono" title={g.name}>
                {g.short}
              </Badge>
            ))}
          </div>
        }
        actions={
          c.organizing ? (
            <div className="flex flex-wrap items-center gap-2">
              <AlertDialog onOpenChange={(open) => open && c.setAlsoDelete(false)}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive" disabled={!c.selected.size || c.removing}>
                    {c.removing ? <Loader2Icon className="animate-spin" /> : <UnlinkIcon />}
                    {t("sessions.removeSelected", { count: c.selected.size })}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t("sessions.confirmRemoveLogs", {
                        count: c.selected.size,
                      })}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t(c.alsoDelete ? "sessions.deleteLogsBody" : "sessions.removeLogsBody", { count: c.selected.size })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                    <Checkbox checked={c.alsoDelete} onCheckedChange={(v) => c.setAlsoDelete(v === true)} />
                    {t("sessions.alsoDeleteLogs")}
                  </label>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={c.removeSelected}>
                      {c.alsoDelete ? t("common.delete") : t("sessions.removeLogs")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button onClick={c.stopOrganizing}>
                <CheckIcon /> {t("sessions.done")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {session.endedAt && logs.length > 0 && (
                <Button variant="outline" onClick={c.startOrganizing}>
                  <ListChecksIcon /> {t("sessions.removeLogs")}
                </Button>
              )}
              {session.endedAt && logs.length > 0 && (
                <Button variant="outline" onClick={c.exportExcel} disabled={c.exporting}>
                  {c.exporting ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />}
                  {c.exporting ? t("sessionExport.exporting") : t("sessionExport.button")}
                </Button>
              )}
              <ShareButton
                kind="sessions"
                shareToken={session.shareToken}
                onSetShared={(shared) => c.setShared(shared)}
                hint={t("sessions.sharedHint")}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive" disabled={c.deleting}>
                    <Trash2Icon /> {t("common.delete")}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("sessions.confirmDelete")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("sessions.deleteHint")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={c.remove}>
                      {t("common.delete")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )
        }
      />

      {c.organizing && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
          <label className="flex cursor-pointer items-center gap-2 font-medium">
            <Checkbox checked={c.allSelected} onCheckedChange={c.toggleAll} />
            {t("sessions.selectAll", { count: logs.length })}
          </label>
          <span className="text-muted-foreground">{t("sessions.removeLogsHint")}</span>
        </div>
      )}

      {c.practice && <PracticeRunCard practice={c.practice} />}

      {!session.endedAt && (
        <Alert>
          <HistoryIcon />
          <AlertDescription>{t("sessions.activeHint", { time: fmt.dateTime(session.expiresAt) })}</AlertDescription>
        </Alert>
      )}

      {sessionService.canResume(session) && (
        <Alert>
          <HistoryIcon />
          <AlertTitle>{t("sessions.expiredTitle")}</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{t("sessions.expiredBody", { time: fmt.dateTime(session.endedAt!) })}</span>
            <Button size="sm" variant="outline" onClick={c.resume} disabled={c.resuming}>
              {c.resuming ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
              {t("sessions.resume")}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("sessions.duration")} value={span ? fmt.span(span.durationMs) : "—"} mono />
        <StatCard label={t("sessions.logs")} value={logs.length} />
        <StatCard label={t("sessions.kills")} value={kills} tone="success" />
        <StatCard label={t("sessions.wipes")} value={wipes} tone="fail" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessions.logsTitle")}</CardTitle>
          {/* "Kills, then wipes" only means something when there are both. */}
          {kills > 0 && wipes > 0 && (
            <CardAction>
              <SessionResultFilterToggle filter={resultFilter.filter} onChange={resultFilter.setFilter} />
            </CardAction>
          )}
          <CardDescription>{t("sessions.durationHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupedLogTable
            logs={logs}
            filter={kills > 0 && wipes > 0 ? resultFilter.filter : "together"}
            selection={c.organizing ? { selected: c.selected, onToggle: c.toggle } : undefined}
          />
        </CardContent>
      </Card>
    </div>
  );
}
