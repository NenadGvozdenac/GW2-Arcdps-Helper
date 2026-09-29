import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { ApiError } from "../../domain/types/api.types";
import AuthShell from "../components/AuthShell";
import ResendVerificationButton from "../components/ResendVerificationButton";
import { describeError } from "../utils/describeError";

function useLoginController() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email, password);
      // The route guard redirects once the user is set.
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  const notVerified = error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED";

  return { email, setEmail, password, setPassword, busy, error, notVerified, submit };
}

export default function LoginPage() {
  const c = useLoginController();
  const { t } = useI18n();

  return (
    <AuthShell
      title={t("auth.loginTitle")}
      onSubmit={c.submit}
      footer={
        <>
          <Button type="submit" className="w-full" disabled={c.busy}>
            {c.busy && <Loader2Icon className="animate-spin" />}
            {c.busy ? t("auth.signingIn") : t("auth.signIn")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("auth.goToRegister")}
            </Link>
          </p>
        </>
      }
    >
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
      <div className="grid gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">{t("auth.password")}</Label>
          <Link
            to="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={c.password}
          onChange={(e) => c.setPassword(e.target.value)}
          required
        />
      </div>
      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}
      {c.notVerified && (
        <div className="grid gap-2">
          <p className="text-sm text-muted-foreground">{t("auth.notVerifiedHint")}</p>
          <ResendVerificationButton email={c.email} />
        </div>
      )}
    </AuthShell>
  );
}
