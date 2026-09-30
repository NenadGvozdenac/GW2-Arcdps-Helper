import { useState } from "react";
import { AlertCircleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/presentation/components/ui/alert-dialog";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { describeError } from "../utils/describeError";

function useDeleteAccountController() {
  const { deleteAccount } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  function setDialogOpen(next: boolean) {
    if (busy) return;
    setOpen(next);
    setPassword("");
    setError(null);
  }

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password); // reloads the app on the landing page
    } catch (err) {
      // Stays open (e.g. a wrong password) so it can be corrected.
      setError(err);
      setBusy(false);
    }
  }

  return { open, setDialogOpen, password, setPassword, busy, error, confirm };
}

/** Settings → permanently delete the account, confirmed with the password in a dialog. */
export default function DeleteAccountCard() {
  const c = useDeleteAccountController();
  const { t } = useI18n();

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle>{t("deleteAccount.title")}</CardTitle>
        <CardDescription>{t("deleteAccount.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={c.open} onOpenChange={c.setDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2Icon /> {t("deleteAccount.button")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                c.confirm();
              }}
            >
              <AlertDialogHeader>
                <AlertDialogTitle>{t("deleteAccount.confirmTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("deleteAccount.confirmBody")}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="deleteAccountPassword">{t("deleteAccount.passwordLabel")}</Label>
                <Input
                  id="deleteAccountPassword"
                  type="password"
                  autoComplete="current-password"
                  value={c.password}
                  onChange={(e) => c.setPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              {c.error != null && (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertDescription>{describeError(c.error, t)}</AlertDescription>
                </Alert>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel type="button" disabled={c.busy}>
                  {t("common.cancel")}
                </AlertDialogCancel>
                {/* A plain submit button, not AlertDialogAction: that one would close the dialog before the result. */}
                <Button type="submit" variant="destructive" disabled={c.busy || !c.password}>
                  {c.busy && <Loader2Icon className="animate-spin" />}
                  {c.busy ? t("deleteAccount.deleting") : t("deleteAccount.confirm")}
                </Button>
              </AlertDialogFooter>
            </form>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
