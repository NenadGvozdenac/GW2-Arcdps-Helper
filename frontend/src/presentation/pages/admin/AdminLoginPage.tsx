import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2Icon, ShieldIcon } from "lucide-react";
import { useAdmin } from "../../../controllers/AdminController";
import { Button } from "@/presentation/components/ui/button";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { ErrorAlert } from "../../components/admin/AdminKit";
import { FullPageSpinner } from "../../components/Spinner";

function useAdminLoginController() {
  const { status, login, handleError } = useAdmin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await login(email, password, code);
    } catch (err) {
      setError(handleError(err));
      // A code is used up or expires in 30 seconds: always type a fresh one.
      setCode("");
      setBusy(false);
    }
  }

  return { status, email, setEmail, password, setPassword, code, setCode, busy, error, submit };
}

/** Sign-in of the administrator: email, password and the current code from the authenticator app. */
export default function AdminLoginPage() {
  const c = useAdminLoginController();
  if (c.status === "checking") return <FullPageSpinner />;
  if (c.status === "signedIn") return <Navigate to="/admin" replace />;

  return (
    <div className="grid min-h-svh place-items-center p-4">
      <form
        className="flex w-full max-w-sm flex-col gap-5 rounded-xl border bg-card p-6"
        onSubmit={(e) => {
          e.preventDefault();
          c.submit();
        }}
      >
        <div className="flex items-center gap-2">
          <ShieldIcon className="size-5 text-destructive" />
          <h1 className="text-lg font-semibold">Admin sign-in</h1>
        </div>
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
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-code">Authenticator code</Label>
          <Input
            id="admin-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            className="font-mono tracking-[0.3em]"
            value={c.code}
            onChange={(e) => c.setCode(e.target.value.replace(/\D/g, ""))}
            required
          />
        </div>
        <Button type="submit" disabled={c.busy}>
          {c.busy && <Loader2Icon className="animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}
