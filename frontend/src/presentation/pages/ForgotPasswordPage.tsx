import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AlertCircleIcon, Loader2Icon, MonitorSmartphoneIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { appLoginService } from "../../services/appLoginService";
import { authService } from "../../services/authService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import AuthShell from "../components/AuthShell";
import { describeError } from "../utils/describeError";

function useForgotPasswordController() {
  const { lang } = useI18n();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  /** Email the link was requested for; the server doesn't say whether that account exists. */
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await authService.forgotPassword(email, lang);
      setSentTo(email.trim());
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  return { email, setEmail, busy, error, sentTo, submit };
}

const backToLogin = (label: string) => (
  <Link to="/login" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
    {label}
  </Link>
);

/**
 * Password reset for guests. The desktop uploader / Nexus addon open it as /forgot-password?app=<request id>: whoever
 * is already signed in here is sent on to approve that app's sign-in instead (no password needed at all).
 */
export default function ForgotPasswordPage() {
  const c = useForgotPasswordController();
  const { t } = useI18n();
  const { user, loading } = useAuth();
  const appRequest = useSearchParams()[0].get("app");
  const appPage = appRequest ? appLoginService.pagePath(appRequest) : null;

  // A saved sign-in is being restored and will most likely redirect away — don't flash the form.
  if (loading) return null;
  if (user) return <Navigate to={appPage ?? "/"} replace />;

  if (c.sentTo) {
    return (
      <AuthShell
        title={t("auth.resetSentTitle")}
        description={t("auth.resetSentBody", { email: c.sentTo })}
        onSubmit={() => {}}
        footer={backToLogin(t("auth.backToLogin"))}
      >
        <p className="text-sm text-muted-foreground">{t("auth.checkSpamOnly")}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.forgotTitle")}
      description={t("auth.forgotDescription")}
      onSubmit={c.submit}
      footer={
        <>
          <Button type="submit" className="w-full" disabled={c.busy}>
            {c.busy && <Loader2Icon className="animate-spin" />}
            {c.busy ? t("auth.sendingResetLink") : t("auth.sendResetLink")}
          </Button>
          {backToLogin(t("auth.backToLogin"))}
        </>
      }
    >
      {appPage && (
        <Alert>
          <MonitorSmartphoneIcon />
          <AlertDescription>
            <span>
              {t("appLogin.forgotHint")}{" "}
              <Link
                to="/login"
                state={{ from: appPage }}
                className="font-medium text-foreground underline underline-offset-4"
              >
                {t("appLogin.forgotHintLink")}
              </Link>
            </span>
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={c.email}
          onChange={(e) => c.setEmail(e.target.value)}
          required
        />
      </div>
      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}
    </AuthShell>
  );
}
