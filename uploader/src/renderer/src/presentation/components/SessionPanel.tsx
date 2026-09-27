import { useMemo, useState } from "react";
import { AlertCircleIcon, FlagIcon, HistoryIcon, Loader2Icon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import type { UploadEntry } from "../../../../shared/upload.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { describeError } from "../utils/describeError";

const isPending = (u: UploadEntry) => u.stage === "queued" || u.stage === "uploading" || u.stage === "syncing";

/** Start of the first fight to the end of the last one, from what dps.report reported for each upload. */
function sessionSpan(uploads: UploadEntry[]): number | null {
  const fights = uploads.filter((u) => u.encounterStart && u.durationMs != null);
  if (!fights.length) return null;
  const start = Math.min(...fights.map((u) => Date.parse(u.encounterStart!)));
  const end = Math.max(...fights.map((u) => Date.parse(u.encounterStart!) + u.durationMs!));
  return end - start;
}

function useSessionPanelController() {
  const { session, uploads, user } = useAppState();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IpcError | null>(null);

  const mine = useMemo(
    () => (session.active ? uploads.filter((u) => u.sessionId === session.active!.id) : []),
    [uploads, session.active],
  );

  async function run(action: () => Promise<{ ok: boolean; error?: IpcError }>) {
    setBusy(true);
    setError(null);
    const res = await action();
    if (!res.ok && res.error) setError(res.error);
    setBusy(false);
  }

  return {
    active: session.active,
    ending: session.ending,
    resumable: session.resumable,
    signedIn: !!user,
    name,
    setName,
    busy,
    error,
    logs: mine.filter((u) => u.stage === "done").length,
    pending: mine.filter(isPending).length,
    spanMs: sessionSpan(mine.filter((u) => u.stage === "done")),
    start: () =>
      run(async () => {
        const res = await uploaderBridge.startSession(name);
        if (res.ok) setName("");
        return res;
      }),
    end: () => run(() => uploaderBridge.endSession()),
    resume: () => run(() => uploaderBridge.resumeSession()),
  };
}

export default function SessionPanel() {
  const c = useSessionPanelController();
  const { t, fmt } = useI18n();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-lg">
            {c.active ? c.active.name || t("session.unnamed") : t("session.title")}
          </CardTitle>
          {c.active && (
            <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
              {t("session.active")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {c.active
            ? t("session.activeHint", { time: fmt.time(c.active.startedAt), expires: fmt.time(c.active.expiresAt) })
            : t("session.hint")}
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {c.active ? (
          <dl className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t("session.logs")}</dt>
              <dd className="text-xl font-semibold tabular-nums">{c.logs}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("session.duration")}</dt>
              <dd className="font-mono text-xl font-semibold tabular-nums">
                {c.spanMs != null ? fmt.duration(c.spanMs) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t("session.pending")}</dt>
              <dd className="text-xl font-semibold tabular-nums">{c.pending}</dd>
            </div>
          </dl>
        ) : (
          <>
            {c.resumable && (
              <Alert>
                <HistoryIcon />
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>{t("session.expired", { name: c.resumable.name || t("session.unnamed") })}</span>
                  <Button size="sm" variant="outline" onClick={c.resume} disabled={c.busy}>
                    <RotateCcwIcon /> {t("session.resume")}
                  </Button>
                </AlertDescription>
              </Alert>
            )}
            <Input
              value={c.name}
              onChange={(e) => c.setName(e.target.value)}
              placeholder={t("session.namePlaceholder")}
              maxLength={80}
              disabled={!c.signedIn || c.busy}
              onKeyDown={(e) => e.key === "Enter" && c.start()}
            />
          </>
        )}
        {c.error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter className="gap-3">
        {c.active ? (
          <>
            <Button variant="outline" onClick={c.end} disabled={c.busy || c.ending}>
              {c.ending ? <Loader2Icon className="animate-spin" /> : <FlagIcon />}
              {t("session.end")}
            </Button>
            {c.ending && (
              <span className="text-sm text-muted-foreground">
                {c.pending ? t("session.waiting", { count: c.pending }) : t("session.ending")}
              </span>
            )}
          </>
        ) : (
          <Button onClick={c.start} disabled={!c.signedIn || c.busy}>
            {c.busy ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
            {t("session.start")}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
