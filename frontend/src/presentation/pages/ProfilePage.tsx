import { useEffect, useState } from "react";
import { AlertCircleIcon, CheckIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardFooter } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import PageHeader from "../components/PageHeader";
import { describeError } from "../utils/describeError";

function useProfileController() {
  const { user, updateProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [gw2Account, setGw2Account] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    setDisplayName(user?.displayName ?? "");
    setGw2Account(user?.gw2Account ?? "");
  }, [user]);

  async function save() {
    setError(null);
    try {
      await updateProfile({ displayName, gw2Account });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err);
    }
  }

  return { email: user?.email ?? "", displayName, setDisplayName, gw2Account, setGw2Account, saved, error, save };
}

export default function ProfilePage() {
  const c = useProfileController();
  const { t } = useI18n();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={t("profile.title")} />
      <Card>
        <form
          className="flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            c.save();
          }}
        >
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="email">{t("profile.email")}</Label>
              <Input id="email" value={c.email} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayName">{t("profile.displayName")}</Label>
              <Input id="displayName" value={c.displayName} onChange={(e) => c.setDisplayName(e.target.value)} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="gw2Account">{t("profile.gw2Account")}</Label>
              <Input
                id="gw2Account"
                value={c.gw2Account}
                onChange={(e) => c.setGw2Account(e.target.value)}
                placeholder="Name.1234"
              />
              <p className="text-sm text-muted-foreground">{t("profile.gw2AccountHint")}</p>
            </div>
            {c.error != null && (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertDescription>{describeError(c.error, t)}</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="gap-3">
            <Button type="submit">{t("common.save")}</Button>
            {c.saved && (
              <span className="inline-flex items-center gap-1 text-sm text-success">
                <CheckIcon className="size-4" /> {t("common.saved")}
              </span>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
