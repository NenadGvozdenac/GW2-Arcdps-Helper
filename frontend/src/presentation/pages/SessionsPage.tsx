import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronRightIcon, CircleHelpIcon, TimerIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { sessionService } from "../../services/sessionService";
import type { SessionView } from "../../domain/types/session.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent } from "@/presentation/components/ui/card";
import PageHeader from "../components/PageHeader";
import { SessionListSkeleton } from "../components/Skeletons";
import { failBadge, successBadge } from "../components/ResultBadge";

function useSessionsController() {
  const { logs, sessions, loading } = useLogs();
  const views = useMemo(() => sessionService.views(sessions, logs), [sessions, logs]);
  return { loading, views };
}

export default function SessionsPage() {
  const c = useSessionsController();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("sessions.title")}
        description={
          <>
            {t("sessions.subtitle")}{" "}
            <Link
              to="/guide/sessions"
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              <CircleHelpIcon className="size-3.5" /> {t("sessions.howTo")}
            </Link>
          </>
        }
      />
      {c.loading ? (
        <SessionListSkeleton />
      ) : c.views.length ? (
        <div className="flex flex-col gap-4">
          {c.views.map((v) => (
            <SessionCard key={v.session.id} view={v} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">{t("sessions.empty")}</CardContent>
        </Card>
      )}
    </div>
  );
}

function SessionCard({ view: v }: { view: SessionView }) {
  const { t, fmt } = useI18n();
  const active = !v.session.endedAt;

  return (
    <Link to={`/sessions/${v.session.id}`} className="group block">
      <Card className="gap-3 py-5 transition-colors group-hover:border-foreground/20">
        <CardContent className="flex flex-col gap-3 px-5">
          <div className="flex items-center gap-3">
            <h2 className="truncate font-semibold">{v.session.name || t("sessions.unnamed")}</h2>
            {active && (
              <Badge variant="outline" className={successBadge}>
                {t("sessions.active")}
              </Badge>
            )}
            {v.session.endReason === "expired" && (
              <Badge variant="secondary" title={t("sessions.expiredHint")}>
                {t("sessions.expired")}
              </Badge>
            )}
            <ChevronRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{fmt.dateTime(v.span?.start ?? v.session.startedAt)}</span>
            {v.span && (
              <span className="inline-flex items-center gap-1 font-mono tabular-nums text-foreground">
                <TimerIcon className="size-3.5" /> {fmt.duration(v.span.durationMs)}
              </span>
            )}
            <span>{v.logs.length ? t("sessions.logsCount", { count: v.logs.length }) : t("sessions.noLogsYet")}</span>
          </div>
          {v.logs.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className={successBadge}>
                {v.kills} {t("sessions.kills")}
              </Badge>
              {v.wipes > 0 && (
                <Badge variant="outline" className={failBadge}>
                  {v.wipes} {t("sessions.wipes")}
                </Badge>
              )}
              {v.groups.map((g) => (
                <Badge key={g.id} variant="secondary" className="font-mono" title={g.name}>
                  {g.short}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
