import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, CheckCircle2Icon, CircleDotIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { logService } from "../../services/logService";
import type { SubmitResult } from "../../domain/types/upload.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Textarea } from "@/presentation/components/ui/textarea";
import { describeError } from "../utils/describeError";
import { failBadge, successBadge } from "./ResultBadge";

function useUploadController() {
  const { refresh } = useLogs();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SubmitResult[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  const links = useMemo(() => logService.extractLinks(text), [text]);
  const summary = useMemo(() => (results ? logService.summarize(results) : null), [results]);

  async function submit() {
    if (!links.length) return;
    setBusy(true);
    setError(null);
    setResults(null);
    setProgress(0);
    try {
      const res = await logService.upload(links, setProgress);
      setResults(res);
      if (res.every((r) => r.status !== "error")) setText("");
      if (res.some((r) => r.status === "ok")) await refresh();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return { text, setText, links, busy, progress, results, summary, error, submit };
}

export default function UploadBox() {
  const { text, setText, links, busy, progress, results, summary, error, submit } = useUploadController();
  const { t } = useI18n();

  return (
    <Card>
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <CardHeader>
          <CardTitle>
            <label htmlFor="links">{t("upload.title")}</label>
          </CardTitle>
          <CardDescription>{t("upload.hint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Textarea
            id="links"
            rows={8}
            className="font-mono text-xs"
            placeholder="https://dps.report/ZM9s-20230109-190505_adina"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={busy}
          />
          {error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(error, t)}</AlertDescription>
            </Alert>
          )}
          {results && summary && (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={successBadge}>
                  {t("upload.added", { count: summary.added })}
                </Badge>
                {summary.duplicates > 0 && <Badge variant="secondary">{t("upload.duplicates", { count: summary.duplicates })}</Badge>}
                {summary.failed > 0 && (
                  <Badge variant="outline" className={failBadge}>
                    {t("upload.failed", { count: summary.failed })}
                  </Badge>
                )}
              </div>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {results.map((r) => (
                  <li key={r.url} className="flex items-start gap-2 break-all">
                    <ResultLine result={r} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {links.length ? t("upload.linksFound", { count: links.length }) : t("upload.noLinks")}
            {busy && t("upload.progress", { done: progress, total: links.length })}
          </span>
          <Button type="submit" disabled={busy || !links.length}>
            {busy && <Loader2Icon className="animate-spin" />}
            {busy ? t("upload.submitting") : t("upload.submit")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function ResultLine({ result: r }: { result: SubmitResult }) {
  const { t } = useI18n();
  switch (r.status) {
    case "ok":
      return (
        <>
          {r.success ? (
            <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-success" />
          ) : (
            <XCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          )}
          <Link to={`/logs/${r.logId}`} className="font-medium hover:underline">
            {r.bossName}
          </Link>
        </>
      );
    case "duplicate":
      return (
        <>
          <CircleDotIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <Link to={`/logs/${r.logId}`} className="hover:underline">
            {r.url}
          </Link>
          <span className="text-muted-foreground">{t("upload.alreadyAdded")}</span>
        </>
      );
    case "error":
      return (
        <>
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
          <span>
            {r.url} <span className="text-muted-foreground" title={r.message}>— {t(`errors.${r.code}`)}</span>
          </span>
        </>
      );
  }
}
