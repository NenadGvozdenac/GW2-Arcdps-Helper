import { useState } from "react";
import { AlertCircleIcon, CheckIcon, CopyIcon, Link2OffIcon, Loader2Icon, Share2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { sessionService } from "../../services/sessionService";
import type { Session } from "../../domain/types/session.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { describeError } from "../utils/describeError";

function useSessionShareController(session: Session) {
  const { setSessionShared } = useLogs();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const url = session.shareToken ? sessionService.shareUrl(session.shareToken) : null;

  async function setShared(shared: boolean) {
    setBusy(true);
    setError(null);
    try {
      await setSessionShared(session.id, shared);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked; the link is still selectable in the field.
    }
  }

  return { url, busy, copied, error, share: () => setShared(true), unshare: () => setShared(false), copy };
}

/** Creates / shows / revokes the public read-only link of a session. */
export default function SessionShareCard({ session }: { session: Session }) {
  const c = useSessionShareController(session);
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Share2Icon className="size-4" /> {t("sessions.shareTitle")}
        </CardTitle>
        <CardDescription>{c.url ? t("sessions.sharedHint") : t("sessions.shareHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {c.url ? (
          <div className="flex flex-wrap gap-2">
            <Input
              readOnly
              value={c.url}
              onFocus={(e) => e.target.select()}
              className="min-w-64 flex-1 font-mono text-xs"
              aria-label={t("sessions.shareTitle")}
            />
            <Button variant="outline" onClick={c.copy}>
              {c.copied ? <CheckIcon /> : <CopyIcon />}
              {c.copied ? t("sessions.copied") : t("sessions.copy")}
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={c.unshare} disabled={c.busy}>
              {c.busy ? <Loader2Icon className="animate-spin" /> : <Link2OffIcon />}
              {t("sessions.stopSharing")}
            </Button>
          </div>
        ) : (
          <Button className="self-start" onClick={c.share} disabled={c.busy}>
            {c.busy ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
            {t("sessions.createLink")}
          </Button>
        )}
        {c.error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
