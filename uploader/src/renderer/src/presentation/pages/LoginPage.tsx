import { useState } from "react";
import { AlertCircleIcon, Loader2Icon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { IpcError } from "../../../../shared/app.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { describeError } from "../utils/describeError";

function useLoginController() {
  const { environment } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IpcError | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    const res = await uploaderBridge.login({ email, password });
    // On success the main process pushes the signed-in state and App switches views.
    if (!res.ok) {
      setError(res.error);
      setBusy(false);
    }
  }

  const openRegister = () => uploaderBridge.openExternal(`${environment.webUrl}/register`);

  return { server: environment.apiUrl, email, setEmail, password, setPassword, busy, error, submit, openRegister };
}

export default function LoginPage() {
  const c = useLoginController();
  const { t } = useI18n();

  return (
    <div className="grid min-h-svh place-items-center bg-[radial-gradient(ellipse_at_top,var(--color-muted),transparent_60%)] p-4">
      <Card className="w-full max-w-sm">
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            c.submit();
          }}
        >
          <CardHeader className="gap-4">
            <div className="flex items-center justify-between gap-2">
              <Brand />
              <LanguageSwitcher />
            </div>
            <div className="space-y-1.5">
              <CardTitle className="text-xl">{t("login.title")}</CardTitle>
              <CardDescription>{t("login.subtitle")}</CardDescription>
              <p className="text-xs text-muted-foreground">{t("login.server", { url: c.server })}</p>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("login.email")}</Label>
              <Input id="email" type="email" autoComplete="email" value={c.email} onChange={(e) => c.setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t("login.password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={c.password}
                onChange={(e) => c.setPassword(e.target.value)}
                required
              />
            </div>
            {c.error && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{describeError(c.error, t)}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={c.busy}>
              {c.busy && <Loader2Icon className="animate-spin" />}
              {c.busy ? t("login.signingIn") : t("login.signIn")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("login.noAccount")}{" "}
              <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={c.openRegister}>
                {t("login.register")}
              </button>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
