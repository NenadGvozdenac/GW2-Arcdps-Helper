import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { ApiError } from "../../domain/types/api.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import AuthShell from "../components/AuthShell";
import { describeError } from "../utils/describeError";

/** Opened from the link in the confirmation email: confirms the address, signs in and goes to the dashboard. */
function useVerifyEmailController() {
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<unknown>(null);
  // StrictMode runs effects twice in development; confirm only once.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get("token");
    if (!token) {
      setError(new ApiError(400, "INVALID_VERIFICATION_LINK", "Missing token."));
      return;
    }
    verifyEmail(token)
      .then(() => navigate("/", { replace: true }))
      .catch(setError);
  }, [params, verifyEmail, navigate]);

  return { error, goToLogin: () => navigate("/login", { replace: true }) };
}

export default function VerifyEmailPage() {
  const { error, goToLogin } = useVerifyEmailController();
  const { t } = useI18n();

  if (error == null) {
    return (
      <AuthShell title={t("auth.verifyingTitle")} onSubmit={() => {}} footer={null}>
        <Loader2Icon className="mx-auto size-6 animate-spin text-muted-foreground" />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("auth.verifyFailedTitle")}
      onSubmit={goToLogin}
      footer={
        <Button type="submit" className="w-full">
          {t("auth.backToLogin")}
        </Button>
      }
    >
      <Alert variant="destructive">
        <AlertCircleIcon />
        <AlertDescription>{describeError(error, t)}</AlertDescription>
      </Alert>
    </AuthShell>
  );
}
