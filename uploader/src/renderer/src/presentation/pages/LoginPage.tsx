import { useState } from "react";
import { AlertCircleIcon, ExternalLinkIcon, Globe2Icon, Loader2Icon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { uploaderBridge } from "../../repositories/uploaderBridge";
import type { BrowserLoginState, IpcError } from "../../../../shared/app.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import Brand from "../components/Brand";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { describeError } from "../utils/describeError";

function useLoginController() {
  const { environment, browserLogin } = useAppState();
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

  /** Opens the website on a sign-in request and waits: whoever is signed in there approves this app (no password here). */
  async function signInWithBrowser() {
    setError(null);
    const res = await uploaderBridge.startBrowserLogin();
    if (!res.ok) setError(res.error);
  }

  const openRegister = () => uploaderBridge.openExternal(`${environment.webUrl}/register`);

  // Resetting happens on the website: it emails a link to a page where the new password is chosen.
  const openForgotPassword = () => uploaderBridge.openExternal(`${environment.webUrl}/forgot-password`);

  return {
    email,
    setEmail,
    password,
    setPassword,
    busy,
    error,
    submit,
    openRegister,
    browserLogin,
    signInWithBrowser,
    openForgotPassword,
    cancelBrowserLogin: () => uploaderBridge.cancelBrowserLogin(),
  };
}

/** Waiting for the sign-in to be approved on the website (or it was denied / expired). */
function BrowserLoginPanel({
  state,
  onRetry,
  onCancel,
}: {
  state: BrowserLoginState;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const waiting = state.status === "waiting";
  return (
    <>
      <CardContent className="flex flex-col gap-4">
        {waiting ? (
          <>
            <div className="grid gap-2 text-center">
              <span className="text-sm text-muted-foreground">{t("login.browserCodeHint")}</span>
              <span className="rounded-lg border bg-muted py-3 font-mono text-3xl font-semibold tracking-[0.2em]">
                {state.code}
              </span>
            </div>
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" /> {t("login.browserWaiting")}
            </p>
          </>
        ) : (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{t(state.status === "denied" ? "login.browserDenied" : "login.browserExpired")}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2">
        {waiting ? (
          <Button type="button" variant="outline" className="w-full" onClick={() => uploaderBridge.openExternal(state.url)}>
            <ExternalLinkIcon /> {t("login.browserReopen")}
          </Button>
        ) : (
          <Button type="button" className="w-full" onClick={onRetry}>
            {t("login.browserRetry")}
          </Button>
        )}
        <Button type="button" variant="ghost" className="w-full" onClick={onCancel}>
          {t("login.browserCancel")}
        </Button>
      </CardFooter>
    </>
  );
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
              <CardTitle className="text-xl">{t(c.browserLogin ? "login.browserTitle" : "login.title")}</CardTitle>
              <CardDescription>{t(c.browserLogin ? "login.browserSubtitle" : "login.subtitle")}</CardDescription>
            </div>
          </CardHeader>
          {c.browserLogin ? (
            <BrowserLoginPanel state={c.browserLogin} onRetry={c.signInWithBrowser} onCancel={c.cancelBrowserLogin} />
          ) : (
            <>
              <CardContent className="flex flex-col gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input id="email" type="email" autoComplete="email" value={c.email} onChange={(e) => c.setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <button
                      type="button"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                      onClick={c.openForgotPassword}
                    >
                      {t("login.forgotPassword")}
                    </button>
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
                <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {t("login.or")}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <Button type="button" variant="outline" className="w-full" onClick={c.signInWithBrowser}>
                  <Globe2Icon /> {t("login.browserSignIn")}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {t("login.noAccount")}{" "}
                  <button type="button" className="font-medium text-foreground underline-offset-4 hover:underline" onClick={c.openRegister}>
                    {t("login.register")}
                  </button>
                </p>
              </CardFooter>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}
