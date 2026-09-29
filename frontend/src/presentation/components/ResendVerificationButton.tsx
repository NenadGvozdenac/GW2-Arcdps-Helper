import { useState } from "react";
import { CheckIcon, Loader2Icon, MailIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { authService } from "../../services/authService";
import { Button } from "@/presentation/components/ui/button";
import { describeError } from "../utils/describeError";

/** Sends the confirmation email to `email` again (the server sends at most one per minute). */
export default function ResendVerificationButton({ email }: { email: string }) {
  const { t, lang } = useI18n();
  const [state, setState] = useState<"idle" | "busy" | "sent">("idle");
  const [error, setError] = useState<unknown>(null);

  async function resend() {
    setState("busy");
    setError(null);
    try {
      await authService.resendVerification(email, lang);
      setState("sent");
    } catch (err) {
      setError(err);
      setState("idle");
    }
  }

  return (
    <div className="grid gap-1.5">
      <Button type="button" variant="outline" className="w-full" disabled={state !== "idle"} onClick={resend}>
        {state === "busy" ? <Loader2Icon className="animate-spin" /> : state === "sent" ? <CheckIcon /> : <MailIcon />}
        {state === "busy" ? t("auth.resending") : state === "sent" ? t("auth.resent") : t("auth.resend")}
      </Button>
      {error != null && <p className="text-sm text-destructive">{describeError(error, t)}</p>}
    </div>
  );
}
