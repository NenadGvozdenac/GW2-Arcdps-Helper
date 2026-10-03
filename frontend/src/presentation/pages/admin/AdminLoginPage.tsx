import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeftIcon, KeyRoundIcon, Loader2Icon, ShieldIcon } from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { ApiError } from "../../../domain/types/api.types";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { ErrorAlert } from "../../components/admin/AdminKit";
import { FullPageSpinner } from "../../components/Spinner";

/**
 * Two steps: email + password; once they are right, a screen that asks only for the authenticator code. The challenge
 * between the steps stays in memory (gone on reload, valid 5 minutes on the server).
 */
function useAdminLoginController() {
  const { status, login, verify, handleError } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPassword() {
    setBusy(true);
    setError(null);
    try {
      setChallenge(await login(email, password));
      setPassword("");
    } catch (err) {
      setError(handleError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode() {
    setBusy(true);
    setError(null);
    try {
      await verify(challenge!, code);
    } catch (err) {
      // Too slow: back to step 1. A wrong code: try the next one.
      if (err instanceof ApiError && err.code === "OTP_CHALLENGE_EXPIRED") setChallenge(null);
      setError(handleError(err));
      setCode("");
      setBusy(false);
    }
  }

  return {
    status,
    step: challenge ? ("code" as const) : ("password" as const),
    email,
    setEmail,
    password,
    setPassword,
    code,
    setCode,
    busy,
    error,
    submitPassword,
    submitCode,
    back: () => {
      setChallenge(null);
      setCode("");
      setError(null);
    },
  };
}

function LoginCard({ title, icon, onSubmit, children }: { title: string; icon: ReactNode; onSubmit: () => void; children: ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>
        {children}
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  const c = useAdminLoginController();
  if (c.status === "checking") return <FullPageSpinner />;
  if (c.status === "signedIn") return <Navigate to="/admin" replace />;

  if (c.step === "code") {
    return (
      <LoginCard title="Authenticator code" icon={<KeyRoundIcon className="size-5 text-destructive" />} onSubmit={c.submitCode}>
        <p className="text-sm text-muted-foreground">
          Open your authenticator app and enter the 6-digit code of <span className="font-medium text-foreground">GW2 ArcDPS Helper</span>.
        </p>
        <ErrorAlert message={c.error} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-code">Code</Label>
          <Input
            id="admin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="font-mono text-lg tracking-[0.4em]"
            value={c.code}
            onChange={(e) => c.setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <Button type="submit" disabled={c.busy || c.code.length !== 6}>
          {c.busy && <Loader2Icon className="animate-spin" />}
          Sign in
        </Button>
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={c.back}>
          <ArrowLeftIcon /> Back
        </Button>
      </LoginCard>
    );
  }

  return (
    <LoginCard title="Admin sign-in" icon={<ShieldIcon className="size-5 text-destructive" />} onSubmit={c.submitPassword}>
      <ErrorAlert message={c.error} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-email">Email</Label>
        <Input id="admin-email" type="email" autoComplete="username" value={c.email} onChange={(e) => c.setEmail(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="admin-password">Password</Label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={c.password}
          onChange={(e) => c.setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={c.busy}>
        {c.busy && <Loader2Icon className="animate-spin" />}
        Continue
      </Button>
    </LoginCard>
  );
}
