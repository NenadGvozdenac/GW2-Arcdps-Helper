import { useState } from "react";
import { AlertCircleIcon, CheckIcon, CopyIcon, Link2OffIcon, Loader2Icon, Share2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { sessionService } from "../../services/sessionService";
import type { Session } from "../../domain/types/session.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Input } from "@/presentation/components/ui/input";
import { describeError } from "../utils/describeError";

function useSessionShareController(session: Session) {
  const { setSessionShared } = useLogs();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const url = session.shareToken ? sessionService.shareUrl(session.shareToken) : null;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return {
    open,
    setOpen,
    url,
    busy,
    copied,
    error,
    /** Creates the link the first time, then shows it. */
    start: () =>
      run(async () => {
        if (!session.shareToken) await setSessionShared(session.id, true);
        setOpen(true);
      }),
    stop: () =>
      run(async () => {
        await setSessionShared(session.id, false);
        setOpen(false);
      }),
    async copy() {
      if (!url) return;
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Clipboard can be blocked; the link is still selectable in the field.
      }
    },
  };
}

/** "Share" button next to Delete: creates the public link and shows it (copy / stop sharing) in a small dialog. */
export default function SessionShareButton({ session }: { session: Session }) {
  const c = useSessionShareController(session);
  const { t } = useI18n();

  return (
    <>
      <Button variant="outline" onClick={c.start} disabled={c.busy && !c.open}>
        {c.busy && !c.open ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
        {t("sessions.shareTitle")}
      </Button>

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("sessions.shareTitle")}</DialogTitle>
            <DialogDescription>{t("sessions.sharedHint")}</DialogDescription>
          </DialogHeader>
          {c.url && (
            <div className="flex gap-2">
              <Input
                readOnly
                value={c.url}
                onFocus={(e) => e.target.select()}
                className="font-mono text-xs"
                aria-label={t("sessions.shareTitle")}
              />
              <Button variant="outline" onClick={c.copy} className="shrink-0">
                {c.copied ? <CheckIcon /> : <CopyIcon />}
                {c.copied ? t("sessions.copied") : t("sessions.copy")}
              </Button>
            </div>
          )}
          {c.error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-destructive" onClick={c.stop} disabled={c.busy}>
              {c.busy ? <Loader2Icon className="animate-spin" /> : <Link2OffIcon />}
              {t("sessions.stopSharing")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
