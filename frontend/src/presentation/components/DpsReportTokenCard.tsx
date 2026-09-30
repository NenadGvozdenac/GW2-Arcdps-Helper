import { useEffect, useState } from "react";
import { AlertCircleIcon, CheckIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { DPS_REPORT_TOKEN_URL } from "../../config/constants";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { describeError } from "../utils/describeError";
import { successBadge } from "./ResultBadge";

type Action = "save" | "remove";

function useDpsReportTokenController() {
  const { user, setDpsReportToken } = useAuth();
  const saved = user?.dpsReportToken ?? "";
  const [token, setToken] = useState(saved);
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setToken(saved);
  }, [saved]);

  async function run(action: Action, value: string, success: TranslationKey) {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      await setDpsReportToken(value);
      setNotice(success);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return {
    token,
    setToken,
    visible,
    toggleVisible: () => setVisible((v) => !v),
    busy,
    notice,
    error,
    isSet: !!saved,
    dirty: token.trim() !== saved,
    save: () => run("save", token, "dpsReportToken.saved"),
    remove: () => run("remove", "", "dpsReportToken.removed"),
  };
}

/**
 * The dps.report user token lives only here, on the account: the website, the desktop uploader and the Nexus addon
 * all upload with it, so logs also land in the user's dps.report account.
 */
export default function DpsReportTokenCard() {
  const c = useDpsReportTokenController();
  const { t } = useI18n();
  const spinner = (a: Action) => c.busy === a && <Loader2Icon className="animate-spin" />;

  return (
    <Card>
      <form
        className="flex flex-1 flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          c.save();
        }}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("dpsReportToken.title")}</CardTitle>
            {c.isSet ? (
              <Badge variant="outline" className={successBadge}>
                {t("dpsReportToken.set")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("dpsReportToken.notSet")}</Badge>
            )}
          </div>
          <CardDescription>{t("dpsReportToken.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="dpsReportToken">{t("dpsReportToken.label")}</Label>
            <div className="flex gap-2">
              <Input
                id="dpsReportToken"
                type={c.visible ? "text" : "password"}
                value={c.token}
                onChange={(e) => c.setToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={c.toggleVisible}
                aria-label={t(c.visible ? "dpsReportToken.hide" : "dpsReportToken.show")}
              >
                {c.visible ? <EyeOffIcon /> : <EyeIcon />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-pretty">
              {t("dpsReportToken.howTo")}{" "}
              <a
                href={DPS_REPORT_TOKEN_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
              >
                dps.report/getUserToken <ExternalLinkIcon className="size-3.5" />
              </a>
            </p>
          </div>
          {c.error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!!c.busy || !c.dirty || !c.token.trim()}>
            {spinner("save")}
            {t("dpsReportToken.save")}
          </Button>
          {c.isSet && (
            <Button type="button" variant="ghost" className="text-destructive" onClick={c.remove} disabled={!!c.busy}>
              {spinner("remove")}
              {t("dpsReportToken.remove")}
            </Button>
          )}
          {c.notice && (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckIcon className="size-4" /> {t(c.notice)}
            </span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
