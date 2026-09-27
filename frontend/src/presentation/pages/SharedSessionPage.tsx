import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { sessionService } from "../../services/sessionService";
import type { SharedSession } from "../../domain/types/session.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import GroupedLogTable from "../components/GroupedLogTable";
import PracticeRunCard from "../components/PracticeRunCard";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

function useSharedSessionController(token: string | undefined) {
  const [data, setData] = useState<SharedSession | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "notFound">("loading");

  useEffect(() => {
    if (!token) {
      setState("notFound");
      return;
    }
    let cancelled = false;
    setState("loading");
    sessionService
      .getShared(token)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setState("ready");
      })
      .catch(() => !cancelled && setState("notFound"));
    return () => {
      cancelled = true;
    };
  }, [token]);

  const summary = useMemo(() => (data ? sessionService.summarize(data.logs) : null), [data]);
  // The best log is the sharing player's (the session owner's).
  const practice = useMemo(() => (data ? sessionService.practiceRun(data.logs, data.owner) : null), [data]);
  return { state, data, summary, practice };
}

/** Public, read-only view of a session opened through its share link (no sign-in needed). */
export default function SharedSessionPage() {
  const { token } = useParams();
  const c = useSharedSessionController(token);
  const { t, fmt } = useI18n();

  if (c.state === "loading") {
    return (
      <div className="flex justify-center py-24" role="status">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (c.state === "notFound" || !c.data || !c.summary) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">{t("sessions.sharedNotFound")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("sessions.sharedNotFoundHint")}</p>
      </div>
    );
  }

  const { session, owner } = c.data;
  const { logs, span, kills, wipes, groups } = c.summary;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={session.name || t("sessions.unnamed")}
        description={
          <div className="flex flex-wrap items-center gap-2">
            {owner && <span>{t("sessions.sharedBy", { name: owner })}</span>}
            {owner && <span>·</span>}
            <span>
              {span ? `${fmt.dateTime(span.start)} – ${fmt.dateTime(span.end)}` : fmt.dateTime(session.startedAt)}
            </span>
            {!session.endedAt && <Badge variant="outline">{t("sessions.active")}</Badge>}
            {groups.map((g) => (
              <Badge key={g.id} variant="secondary" className="font-mono" title={g.name}>
                {g.short}
              </Badge>
            ))}
          </div>
        }
      />

      {c.practice && <PracticeRunCard practice={c.practice} openOnDpsReport />}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("sessions.duration")} value={span ? fmt.span(span.durationMs) : "—"} mono />
        <StatCard label={t("sessions.logs")} value={logs.length} />
        <StatCard label={t("sessions.kills")} value={kills} tone="success" />
        <StatCard label={t("sessions.wipes")} value={wipes} tone="fail" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("sessions.logsTitle")}</CardTitle>
          <CardDescription>{t("sessions.sharedLogsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <GroupedLogTable logs={logs} openOnDpsReport />
        </CardContent>
      </Card>
    </div>
  );
}
