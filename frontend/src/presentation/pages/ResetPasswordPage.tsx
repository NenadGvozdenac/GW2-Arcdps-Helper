import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { ApiError } from "../../domain/types/api.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import AuthShell from "../components/AuthShell";
import { describeError } from "../utils/describeError";

/** Opened from the password-reset email: sets a new password, signs in and goes to the dashboard. */
function useResetPasswordController() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(
    token ? null : new ApiError(400, "INVALID_RESET_LINK", "Missing token."),
  );
  const linkInvalid = error instanceof ApiError && error.code === "INVALID_RESET_LINK";

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await resetPassword(token, password, confirmPassword);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return { password, setPassword, confirmPassword, setConfirmPassword, busy, error, linkInvalid, submit };
}

export default function ResetPasswordPage() {
  const c = useResetPasswordController();
  const { t } = useI18n();

  return (
    <AuthShell
      title={t("auth.resetTitle")}
      onSubmit={c.submit}
      footer={
        c.linkInvalid ? (
          <Button asChild className="w-full">
            <Link to="/forgot-password">{t("auth.sendResetLink")}</Link>
          </Button>
        ) : (
          <Button type="submit" className="w-full" disabled={c.busy}>
            {c.busy && <Loader2Icon className="animate-spin" />}
            {c.busy ? t("auth.savingPassword") : t("auth.savePassword")}
          </Button>
        )
      }
    >
      {!c.linkInvalid && (
        <>
          <div className="grid gap-2">
            <Label htmlFor="password">{t("auth.newPassword")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              value={c.password}
              onChange={(e) => c.setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmPassword">{t("auth.confirmPassword")}</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={c.confirmPassword}
              onChange={(e) => c.setConfirmPassword(e.target.value)}
              required
            />
          </div>
        </>
      )}
      {c.error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(c.error, t)}</AlertDescription>
        </Alert>
      )}
    </AuthShell>
  );
}
