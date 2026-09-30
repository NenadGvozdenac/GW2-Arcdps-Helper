import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon, MonitorSmartphoneIcon, XCircleIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import type { AppLoginRequest } from "../../domain/types/appLogin.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { appLoginService } from "../../services/appLoginService";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import AuthShell from "../components/AuthShell";
import { describeError } from "../utils/describeError";

type State =
  | { kind: "loading" }
  | { kind: "ready"; request: AppLoginRequest }
  | { kind: "approved"; request: AppLoginRequest }
  | { kind: "denied"; request: AppLoginRequest }
  | { kind: "gone" };

const CLIENT_LABEL: Record<AppLoginRequest["client"], TranslationKey> = {
  uploader: "appLogin.clientUploader",
  addon: "appLogin.clientAddon",
};

function useAppLoginController(id: string | undefined) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) return setState({ kind: "gone" });
    let cancelled = false;
    appLoginService
      .get(id)
      .then((request) => {
        if (cancelled) return;
        // Only a pending request can be decided; an already used one is "gone" like an expired one.
        setState(request.status === "pending" ? { kind: "ready", request } : { kind: "gone" });
      })
      .catch(() => !cancelled && setState({ kind: "gone" }));
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function decide(approve: boolean) {
    if (state.kind !== "ready" || !id) return;
    setBusy(true);
    setError(null);
    try {
      await (approve ? appLoginService.approve(id) : appLoginService.deny(id));
      setState({ kind: approve ? "approved" : "denied", request: state.request });
    } catch (err) {
      setError(err);
    }
    setBusy(false);
  }

  return { state, busy, error, approve: () => decide(true), deny: () => decide(false) };
}

const toSite = (label: string) => (
  <Link to="/" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
    {label}
  </Link>
);

/**
 * /app-login/:id — the desktop uploader or the Nexus addon asks to be signed in as the user signed in here. Always
 * needs a click (and shows the code the app shows), so a link someone else sent can't sign their app in to your account.
 */
export default function AppLoginPage() {
  const { id } = useParams();
  const c = useAppLoginController(id);
  const { accountLabel } = useAuth();
  const { t } = useI18n();
  const { state } = c;

  if (state.kind === "loading") {
    return (
      <div className="grid min-h-svh place-items-center" role="status" aria-busy="true">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.kind === "gone") {
    return (
      <AuthShell
        title={t("appLogin.expiredTitle")}
        description={t("appLogin.expiredBody")}
        onSubmit={() => {}}
        footer={toSite(t("appLogin.toSite"))}
      >
        <XCircleIcon className="size-10 text-muted-foreground" />
      </AuthShell>
    );
  }

  const app = t(CLIENT_LABEL[state.request.client]);

  if (state.kind === "approved" || state.kind === "denied") {
    const approved = state.kind === "approved";
    return (
      <AuthShell
        title={t(approved ? "appLogin.approvedTitle" : "appLogin.deniedTitle")}
        description={t(approved ? "appLogin.approvedBody" : "appLogin.deniedBody", { app })}
        onSubmit={() => {}}
        footer={toSite(t("appLogin.toSite"))}
      >
        {approved ? (
          <CheckCircle2Icon className="size-10 text-success" />
        ) : (
          <XCircleIcon className="size-10 text-muted-foreground" />
        )}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t("appLogin.title", { app })}
      description={t("appLogin.body", { app, account: accountLabel })}
      onSubmit={c.approve}
      footer={
        <div className="flex w-full flex-col gap-2">
          <Button type="submit" className="w-full" disabled={c.busy}>
            {c.busy ? <Loader2Icon className="animate-spin" /> : <MonitorSmartphoneIcon />}
            {c.busy ? t("appLogin.approving") : t("appLogin.approve")}
          </Button>
          <Button type="button" variant="outline" className="w-full" disabled={c.busy} onClick={c.deny}>
            {t("appLogin.deny")}
          </Button>
        </div>
      }
    >
      <div className="grid gap-2 text-center">
        <span className="text-sm text-muted-foreground">{t("appLogin.codeLabel")}</span>
        <span className="rounded-lg border bg-muted py-3 font-mono text-3xl font-semibold tracking-[0.2em]">
          {state.request.code}
        </span>
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
