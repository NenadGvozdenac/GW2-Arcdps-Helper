import { useMemo, useState } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  CircleHelpIcon,
  FlagIcon,
  HistoryIcon,
  Loader2Icon,
  PencilIcon,
  PlayIcon,
  RotateCcwIcon,
  XIcon,
} from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import type { UploadEntry } from "../../../../shared/upload.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent } from "@/presentation/components/ui/card";
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
  const { session, uploads, user, environment } = useAppState();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  // null = not renaming; otherwise the name being typed.
  const [draft, setDraft] = useState<string | null>(null);
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
    draft,
    setDraft,
    startRename: () => setDraft(session.active?.name ?? ""),
    cancelRename: () => setDraft(null),
    saveRename: () =>
      run(async () => {
        if (draft === null) return { ok: true };
        const res = await uploaderBridge.renameSession(draft);
        if (res.ok) setDraft(null);
        return res;
      }),
    end: () => run(() => uploaderBridge.endSession()),
    openGuide: () => uploaderBridge.openExternal(`${environment.webUrl}/guide/sessions`),
    resume: () => run(() => uploaderBridge.resumeSession()),
  };
}

/** "?" that opens the website's explanation of sessions. */
function HelpButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0 text-muted-foreground"
      onClick={onClick}
      title={label}
      aria-label={label}
    >
      <CircleHelpIcon />
    </Button>
  );
}

/** Compact one-row card: start a session, or see the running one and end it. */
export default function SessionPanel() {
  const c = useSessionPanelController();
  const { t, fmt } = useI18n();

  return (
    <Card className="gap-3 py-4">
      <CardContent className="flex flex-col gap-3 px-5">
        {c.active ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex min-w-0 items-center gap-2">
              {c.draft !== null ? (
                <>
                  <Input
                    autoFocus
                    value={c.draft}
                    onChange={(e) => c.setDraft(e.target.value)}
                    placeholder={t("session.namePlaceholder")}
                    maxLength={80}
                    disabled={c.busy}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") c.saveRename();
                      if (e.key === "Escape") c.cancelRename();
                    }}
                    className="h-8 w-56"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0"
                    onClick={c.saveRename}
                    disabled={c.busy}
                    title={t("common.save")}
                    aria-label={t("common.save")}
                  >
                    {c.busy ? <Loader2Icon className="animate-spin" /> : <CheckIcon />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground"
                    onClick={c.cancelRename}
                    disabled={c.busy}
                    title={t("session.cancelRename")}
                    aria-label={t("session.cancelRename")}
                  >
                    <XIcon />
                  </Button>
                </>
              ) : (
                <>
                  <span className="truncate font-semibold">{c.active.name || t("session.unnamed")}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 shrink-0 text-muted-foreground"
                    onClick={c.startRename}
                    title={t("session.rename")}
                    aria-label={t("session.rename")}
                  >
                    <PencilIcon />
                  </Button>
                </>
              )}
              <Badge variant="outline" className="border-success/40 bg-success/10 text-success">
                {t("session.active")}
              </Badge>
              <HelpButton onClick={c.openGuide} label={t("session.howTo")} />
            </div>
            <span
              className="text-sm text-muted-foreground"
              title={t("session.expiresAt", { time: fmt.time(c.active.expiresAt) })}
            >
              {t("session.since", { time: fmt.time(c.active.startedAt) })}
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">{t("session.logs")}:</span>{" "}
              <span className="font-semibold tabular-nums">{c.logs}</span>
            </span>
            <span className="text-sm">
              <span className="text-muted-foreground">{t("session.duration")}:</span>{" "}
              <span className="font-mono font-semibold tabular-nums">
                {c.spanMs != null ? fmt.span(c.spanMs) : "—"}
              </span>
            </span>
            {c.pending > 0 && (
              <span className="text-sm">
                <span className="text-muted-foreground">{t("session.pending")}:</span>{" "}
                <span className="font-semibold tabular-nums">{c.pending}</span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {c.ending && (
                <span className="text-sm text-muted-foreground">
                  {c.pending ? t("session.waiting", { count: c.pending }) : t("session.ending")}
                </span>
              )}
              <Button size="sm" variant="outline" onClick={c.end} disabled={c.busy || c.ending}>
                {c.ending ? <Loader2Icon className="animate-spin" /> : <FlagIcon />}
                {t("session.end")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="shrink-0 font-semibold" title={t("session.hint")}>
              {t("session.title")}
            </span>
            <HelpButton onClick={c.openGuide} label={t("session.howTo")} />
            <Input
              value={c.name}
              onChange={(e) => c.setName(e.target.value)}
              placeholder={t("session.namePlaceholder")}
              maxLength={80}
              disabled={!c.signedIn || c.busy}
              onKeyDown={(e) => e.key === "Enter" && c.start()}
              className="h-8"
            />
            <Button size="sm" onClick={c.start} disabled={!c.signedIn || c.busy} className="shrink-0">
              {c.busy ? <Loader2Icon className="animate-spin" /> : <PlayIcon />}
              {t("session.start")}
            </Button>
          </div>
        )}
        {!c.active && c.resumable && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <HistoryIcon className="size-4" />
              {t("session.expired", { name: c.resumable.name || t("session.unnamed") })}
            </span>
            <Button size="sm" variant="outline" onClick={c.resume} disabled={c.busy}>
              <RotateCcwIcon /> {t("session.resume")}
            </Button>
          </div>
        )}
        {c.error && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
