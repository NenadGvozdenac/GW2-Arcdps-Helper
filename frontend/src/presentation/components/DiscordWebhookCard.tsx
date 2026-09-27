import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, CheckIcon, CircleHelpIcon, Loader2Icon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { profileService } from "../../services/profileService";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { describeError } from "../utils/describeError";
import { successBadge } from "./ResultBadge";

type Action = "save" | "test" | "disconnect";

function useDiscordWebhookController() {
  const { user, setDiscordWebhook } = useAuth();
  const saved = user?.discordWebhookUrl ?? "";
  const [url, setUrl] = useState(saved);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => setUrl(saved), [saved]);

  async function run(action: Action, fn: () => Promise<void>, success: TranslationKey) {
    setBusy(action);
    setError(null);
    setNotice(null);
    try {
      await fn();
      setNotice(success);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  }

  return {
    url,
    setUrl,
    busy,
    notice,
    error,
    connected: !!saved,
    dirty: url.trim() !== saved,
    save: () => run("save", () => setDiscordWebhook(url), "discord.saved"),
    test: () => run("test", () => profileService.testDiscordWebhook(url), "discord.testSent"),
    disconnect: () => run("disconnect", () => setDiscordWebhook(""), "discord.disconnected"),
  };
}

export default function DiscordWebhookCard() {
  const c = useDiscordWebhookController();
  const { t } = useI18n();
  const spinner = (a: Action) => c.busy === a && <Loader2Icon className="animate-spin" />;

  return (
    <Card>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          c.save();
        }}
      >
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>{t("discord.title")}</CardTitle>
            {c.connected ? (
              <Badge variant="outline" className={successBadge}>
                {t("discord.connected")}
              </Badge>
            ) : (
              <Badge variant="secondary">{t("discord.notConnected")}</Badge>
            )}
          </div>
          <CardDescription>{t("discord.description")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="discordWebhook">{t("discord.urlLabel")}</Label>
            <Input
              id="discordWebhook"
              type="url"
              value={c.url}
              onChange={(e) => c.setUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/…"
              autoComplete="off"
              spellCheck={false}
            />
            <Link
              to="/guide/discord"
              className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <CircleHelpIcon className="size-4" /> {t("discord.howTo")}
            </Link>
          </div>
          {c.error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!!c.busy || !c.dirty || !c.url.trim()}>
            {spinner("save")}
            {t("discord.save")}
          </Button>
          <Button type="button" variant="outline" onClick={c.test} disabled={!!c.busy || !c.url.trim()}>
            {spinner("test")}
            {t("discord.test")}
          </Button>
          {c.connected && (
            <Button type="button" variant="ghost" className="text-destructive" onClick={c.disconnect} disabled={!!c.busy}>
              {spinner("disconnect")}
              {t("discord.disconnect")}
            </Button>
          )}
          {c.notice && (
            <span className="inline-flex items-center gap-1 text-sm text-success">
              <CheckIcon className="size-4" /> {t(c.notice)}
            </span>
          )}
        </CardFooter>
      </form>
    </Card>
  );
}
