import { useState } from "react";
import { AlertCircleIcon, CheckIcon, CopyIcon, Link2OffIcon, Loader2Icon, Share2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { shareService, type ShareKind } from "../../services/shareService";
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

interface Props {
  kind: ShareKind;
  /** Current share token (null = not shared). */
  shareToken: string | null;
  /** Creates (true) or revokes (false) the public link. */
  onSetShared: (shared: boolean) => Promise<void>;
  /** What the link shows, e.g. "Anyone with this link can see this log." */
  hint: string;
}

function useShareController({ kind, shareToken, onSetShared }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const url = shareToken ? shareService.url(kind, shareToken) : null;

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
        if (!shareToken) await onSetShared(true);
        setOpen(true);
      }),
    stop: () =>
      run(async () => {
        await onSetShared(false);
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

/** "Share" button: creates a public read-only link and shows it (copy / stop sharing) in a small dialog. */
export default function ShareButton(props: Props) {
  const c = useShareController(props);
  const { t } = useI18n();

  return (
    <>
      <Button variant="outline" onClick={c.start} disabled={c.busy && !c.open}>
        {c.busy && !c.open ? <Loader2Icon className="animate-spin" /> : <Share2Icon />}
        {t("share.title")}
      </Button>

      <Dialog open={c.open} onOpenChange={c.setOpen}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("share.title")}</DialogTitle>
            <DialogDescription>{props.hint}</DialogDescription>
          </DialogHeader>
          {c.url && (
            <div className="flex gap-2">
              <Input
                readOnly
                value={c.url}
                onFocus={(e) => e.target.select()}
                className="font-mono text-xs"
                aria-label={t("share.title")}
              />
              <Button variant="outline" onClick={c.copy} className="shrink-0">
                {c.copied ? <CheckIcon /> : <CopyIcon />}
                {c.copied ? t("share.copied") : t("share.copy")}
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
              {t("share.stop")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
