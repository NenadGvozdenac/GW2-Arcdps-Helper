import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertCircleIcon, ArrowLeftIcon, HistoryIcon, Loader2Icon, RotateCcwIcon, Trash2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useAuth } from "../../controllers/AuthController";
import { useLogs } from "../../controllers/LogsController";
import { sessionService } from "../../services/sessionService";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import LogTable from "../components/LogTable";
import PracticeRunCard from "../components/PracticeRunCard";
import ShareButton from "../components/ShareButton";
import PageHeader from "../components/PageHeader";
import { successBadge } from "../components/ResultBadge";
import StatCard from "../components/StatCard";
import { describeError } from "../utils/describeError";

function useSessionDetailController(id: string | undefined) {
  const { logs, sessions, removeSession, resumeSession, setSessionShared } = useLogs();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const { user } = useAuth();
  const view = useMemo(() => {
    const session = sessions.find((s) => s.id === id);
    return session ? sessionService.views([session], logs)[0] : null;
  }, [sessions, logs, id]);
  const practice = useMemo(
    () => (view ? sessionService.practiceRun(view.logs, user?.gw2Account ?? "") : null),
    [view, user?.gw2Account],
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

  return {
    setShared: (shared: boolean) => (view ? setSessionShared(view.session.id, shared) : Promise.resolve()),
    practice,
    view,
    deleting,
    resuming,
    error,
    remove,
    resume,
  };
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const c = useSessionDetailController(id);
  const { t, fmt } = useI18n();

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
        title={session.name || t("sessions.unnamed")}
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
          <div className="flex gap-2">
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
        }
      />

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
          <CardDescription>{t("sessions.durationHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <LogTable logs={logs} showGroup />
        </CardContent>
      </Card>
    </div>
  );
}
