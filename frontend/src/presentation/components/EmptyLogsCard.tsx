import { useState } from "react";
import { AlertCircleIcon, CheckIcon, CircleHelpIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Label } from "@/presentation/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/presentation/components/ui/popover";
import { describeError } from "../utils/describeError";

function useEmptyLogsController() {
  const { user, setSkipEmptyLogs } = useAuth();
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function toggle(enabled: boolean) {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await setSkipEmptyLogs(enabled);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return { enabled: user?.skipEmptyLogs ?? true, busy, saved, error, toggle };
}

/**
 * Whether empty logs (a wipe with the boss at 100% and 0 DPS from everyone, written by an ArcDPS bug) are skipped:
 * not saved, not posted to Discord and dropped from the desktop uploader's and the Nexus addon's upload list.
 * Saved as soon as the checkbox changes. The "?" next to the title explains why (the ArcDPS bug).
 */
export default function EmptyLogsCard() {
  const c = useEmptyLogsController();
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("emptyLogs.title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="skipEmptyLogs"
            className="mt-0.5"
            checked={c.enabled}
            onCheckedChange={(v) => c.toggle(v === true)}
            disabled={c.busy}
          />
          <div className="grid gap-1.5">
            <div className="flex items-center gap-1">
              <Label htmlFor="skipEmptyLogs">{t("emptyLogs.label")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="-my-1 size-6 text-foreground"
                    aria-label={t("emptyLogs.whyToggle")}
                    title={t("emptyLogs.whyToggle")}
                  >
                    <CircleHelpIcon />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 text-sm text-pretty">
                  {t("emptyLogs.why")}
                </PopoverContent>
              </Popover>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">{t("emptyLogs.hint")}</p>
          </div>
        </div>
        {c.error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{describeError(c.error, t)}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      {(c.busy || c.saved) && (
        <CardFooter className="mt-auto">
          {c.busy ? (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckIcon className="size-4" /> {t("emptyLogs.saved")}
            </span>
          )}
        </CardFooter>
      )}
    </Card>
  );
}
