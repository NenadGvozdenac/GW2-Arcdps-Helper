import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { RegisterInput } from "../../domain/types/user.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import AuthShell from "../components/AuthShell";
import ResendVerificationButton from "../components/ResendVerificationButton";
import { describeError } from "../utils/describeError";

const EMPTY: RegisterInput = { gw2Account: "", email: "", password: "", confirmPassword: "" };

function useRegisterController() {
  const { register } = useAuth();
  const { lang } = useI18n();
  const [form, setForm] = useState<RegisterInput>(EMPTY);
  /** Where the confirmation link was sent; set once the account exists. */
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const setField = (field: keyof RegisterInput, value: string) => setForm((f) => ({ ...f, [field]: value }));

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      setSentTo(await register(form, lang));
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  return { form, setField, busy, error, submit, sentTo };
}

/** Shown after registering: the account can be used once the emailed link is clicked. */
function CheckInbox({ email }: { email: string }) {
  const { t } = useI18n();
  return (
    <AuthShell
      title={t("auth.checkInboxTitle")}
      description={t("auth.checkInboxBody", { email })}
      onSubmit={() => {}}
      footer={
        <Link to="/login" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
          {t("auth.backToLogin")}
        </Link>
      }
    >
      <p className="text-sm text-muted-foreground">{t("auth.checkSpam")}</p>
      <ResendVerificationButton email={email} />
    </AuthShell>
  );
}

export default function RegisterPage() {
  const { form, setField, busy, error, submit, sentTo } = useRegisterController();
  const { t } = useI18n();

  if (sentTo) return <CheckInbox email={sentTo} />;

  return (
    <AuthShell
      title={t("auth.registerTitle")}
      onSubmit={submit}
      footer={
        <>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2Icon className="animate-spin" />}
            {busy ? t("auth.creatingAccount") : t("auth.createAccount")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("auth.haveAccount")}{" "}
            <Link to="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
              {t("auth.goToLogin")}
            </Link>
          </p>
        </>
      }
    >
      <div className="grid gap-2">
        <Label htmlFor="gw2Account">{t("auth.gw2Account")}</Label>
        <Input
          id="gw2Account"
          value={form.gw2Account}
          onChange={(e) => setField("gw2Account", e.target.value)}
          placeholder="User.1234"
          autoComplete="username"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">{t("auth.email")}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => setField("email", e.target.value)}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">{t("auth.password")}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={(e) => setField("password", e.target.value)}
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
          value={form.confirmPassword}
          onChange={(e) => setField("confirmPassword", e.target.value)}
          required
        />
      </div>
      {error != null && (
        <Alert variant="destructive">
          <AlertCircleIcon />
          <AlertDescription>{describeError(error, t)}</AlertDescription>
        </Alert>
      )}
    </AuthShell>
  );
}
