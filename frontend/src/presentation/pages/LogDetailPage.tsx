import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon, Trash2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { logService } from "../../services/logService";
import { profileService } from "../../services/profileService";
import type { Category } from "../../domain/types/encounter.types";
import type { PlayerSummary } from "../../domain/types/log.types";
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
import LogView from "../components/LogView";
import ShareButton from "../components/ShareButton";
import { describeError } from "../utils/describeError";

const CATEGORY_PATH: Record<Category, string> = {
  raid: "/raids-strikes",
  fractal: "/fractals",
  strike: "/raids-strikes",
  other: "/logs",
};

/** The squad of one log, loaded on its own (the shared list leaves it out); null while loading or when it failed. */
function useSquad(id: string | undefined): PlayerSummary[] | null {
  const [squad, setSquad] = useState<{ id: string; players: PlayerSummary[] } | null>(null);
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    logService
      .get(id)
      .then((detail) => !cancelled && setSquad({ id, players: detail.players }))
      .catch(() => !cancelled && setSquad({ id, players: [] }));
    return () => {
      cancelled = true;
    };
  }, [id]);
  return squad && squad.id === id ? squad.players : null;
}

function useLogDetailController(id: string | undefined) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { logs, remove: removeLog, setLogShared } = useLogs();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const log = logs.find((l) => l.id === id) ?? null;
  const players = useSquad(log?.id);
  const group = encounterService.groupById(log?.groupId ?? null);

  const backLink = log
    ? {
        to: CATEGORY_PATH[log.category] + (log.encounterKey ? `?boss=${log.encounterKey}` : ""),
        label: group ? `${group.short} — ${group.name}` : null,
      }
    : { to: "/logs", label: null };
  // Opened from somewhere in the app (a session, the dashboard, ...) → go back there; a direct visit falls back to the boss.
  const canGoBack = location.key !== "default";

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
    log,
    players,
    backLink,
    canGoBack,
    goBack: () => navigate(-1),
    setShared: (shared: boolean) => (log ? setLogShared(log.id, shared) : Promise.resolve()),
    deleting,
    error,
    remove,
    isOwnAccount: (account: string) => profileService.isOwnAccount(user, account),
  };
}

export default function LogDetailPage() {
  const { id } = useParams();
  const { log, players, backLink, canGoBack, goBack, setShared, deleting, error, remove, isOwnAccount } =
    useLogDetailController(id);
  const { t } = useI18n();

  if (!log) {
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
      {canGoBack ? (
        <Button variant="ghost" size="sm" className="cursor-pointer self-start" onClick={goBack}>
          <ArrowLeftIcon /> {t("logDetail.back")}
        </Button>
      ) : (
        <Button asChild variant="ghost" size="sm" className="self-start">
          <Link to={backLink.to}>
            <ArrowLeftIcon /> {backLink.label ?? t("logDetail.allLogs")}
          </Link>
        </Button>
      )}

      <LogView
        log={log}
        players={players}
        isOwnAccount={isOwnAccount}
        actions={
          <>
            <Button asChild>
              <a href={log.url} target="_blank" rel="noreferrer">
                dps.report <ExternalLinkIcon />
              </a>
            </Button>
            <ShareButton
              kind="logs"
              shareToken={log.shareToken}
              onSetShared={setShared}
              hint={t("logDetail.sharedHint")}
            />
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
          </>
        }
      >
        {error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(error, t)}</AlertDescription>
          </Alert>
        )}
      </LogView>
    </div>
  );
}
