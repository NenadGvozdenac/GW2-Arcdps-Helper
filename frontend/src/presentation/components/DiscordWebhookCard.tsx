import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, CheckIcon, CircleHelpIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { profileService } from "../../services/profileService";
import type { DiscordContent, DiscordWebhook } from "../../domain/types/user.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/presentation/components/ui/card";
import { Input } from "@/presentation/components/ui/input";
import { Label } from "@/presentation/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import { describeError } from "../utils/describeError";
import { successBadge } from "./ResultBadge";

type Action = "save" | "test" | "testSecond" | "disconnect";

const CONTENT_LABELS: Record<DiscordContent, TranslationKey> = {
  all: "discord.contentAll",
  logs: "discord.contentLogs",
  sessions: "discord.contentSessions",
};

const ALL_CONTENTS: DiscordContent[] = ["all", "logs", "sessions"];
/** With two webhooks each posts one kind. */
const SPLIT_CONTENTS: DiscordContent[] = ["logs", "sessions"];

/** What the second webhook posts: whatever the first one doesn't. */
const otherContent = (content: DiscordContent): DiscordContent => (content === "sessions" ? "logs" : "sessions");

function useDiscordWebhookController() {
  /** What is saved on the server, in order; null while loading. */
  const [saved, setSaved] = useState<DiscordWebhook[] | null>(null);
  const [url, setUrl] = useState("");
  const [content, setContent] = useState<DiscordContent>("all");
  const [enabled, setEnabled] = useState(true);
  const [hasSecond, setHasSecond] = useState(false);
  const [secondUrl, setSecondUrl] = useState("");
  const [secondEnabled, setSecondEnabled] = useState(true);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<unknown>(null);

  /** Shows the saved webhooks in the form. */
  function load(webhooks: DiscordWebhook[]) {
    const [first, second] = webhooks;
    setSaved(webhooks);
    setUrl(first?.url ?? "");
    setContent(first?.content ?? "all");
    setEnabled(first?.enabled ?? true);
    setHasSecond(!!second);
    setSecondUrl(second?.url ?? "");
    setSecondEnabled(second?.enabled ?? true);
  }

  useEffect(() => {
    profileService.getDiscordWebhooks().then(load, setError);
  }, []);

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

  const webhooks: DiscordWebhook[] = [
    { url: url.trim(), content, enabled },
    ...(hasSecond ? [{ url: secondUrl.trim(), content: otherContent(content), enabled: secondEnabled }] : []),
  ];

  return {
    loading: saved === null,
    url,
    setUrl,
    content,
    setContent,
    enabled,
    setEnabled,
    secondUrl,
    setSecondUrl,
    secondEnabled,
    setSecondEnabled,
    hasSecond,
    /** A second webhook posts the rest, so the first one then posts only logs or only sessions. */
    addSecond: () => {
      setHasSecond(true);
      setSecondEnabled(true);
      if (content === "all") setContent("logs");
    },
    removeSecond: () => {
      setHasSecond(false);
      setSecondUrl("");
    },
    secondContent: otherContent(content),
    /** Picking what the second webhook posts gives the first one the rest. */
    setSecondContent: (v: DiscordContent) => setContent(otherContent(v)),
    busy,
    notice,
    error,
    connected: !!saved?.length,
    dirty: saved !== null && JSON.stringify(webhooks) !== JSON.stringify(saved),
    canSave: webhooks.every((w) => w.url),
    save: () => run("save", async () => load(await profileService.setDiscordWebhooks(webhooks)), "discord.saved"),
    test: () => run("test", () => profileService.testDiscordWebhook(url, content), "discord.testSent"),
    testSecond: () =>
      run("testSecond", () => profileService.testDiscordWebhook(secondUrl, otherContent(content)), "discord.testSent"),
    disconnect: () =>
      run("disconnect", async () => load(await profileService.setDiscordWebhooks([])), "discord.disconnected"),
  };
}

interface WebhookFieldsProps {
  id: string;
  label: string;
  url: string;
  onUrlChange: (url: string) => void;
  content: DiscordContent;
  contents: DiscordContent[];
  onContentChange: (content: DiscordContent) => void;
  /** The "Active" checkbox: a paused webhook keeps its URL but gets nothing. */
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onTest: () => void;
  testing: boolean;
  busy: boolean;
  /** Shown only for the second webhook. */
  onRemove?: () => void;
}

/** One webhook: its URL, what it posts and a test message — the same for the first and the second one. */
function WebhookFields(p: WebhookFieldsProps) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4">
      <div className="flex min-h-7 items-center justify-between gap-2">
        <Label htmlFor={p.id}>{p.label}</Label>
        <div className="flex items-center gap-1">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={p.enabled}
              onCheckedChange={(checked) => p.onEnabledChange(checked === true)}
              disabled={p.busy}
            />
            {t("discord.active")}
          </label>
          {p.onRemove && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={p.onRemove}
              disabled={p.busy}
              aria-label={t("discord.removeSecond")}
              title={t("discord.removeSecond")}
            >
              <XIcon />
            </Button>
          )}
        </div>
      </div>
      <Input
        id={p.id}
        type="url"
        value={p.url}
        onChange={(e) => p.onUrlChange(e.target.value)}
        placeholder="https://discord.com/api/webhooks/…"
        autoComplete="off"
        spellCheck={false}
      />
      <div className="grid gap-2">
        <Label>{t("discord.contentLabel")}</Label>
        {/* The test button sits on the toggle's row, pushed to the right (wraps below it when there is no room). */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ToggleGroup
            type="single"
            variant="outline"
            value={p.content}
            onValueChange={(v) => v && p.onContentChange(v as DiscordContent)}
            className="flex-wrap"
          >
            {p.contents.map((v) => (
              <ToggleGroupItem key={v} value={v} className="px-4">
                {t(CONTENT_LABELS[v])}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button type="button" onClick={p.onTest} disabled={p.busy || !p.url.trim()}>
            {p.testing && <Loader2Icon className="animate-spin" />}
            {t("discord.test")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function DiscordWebhookCard() {
  const c = useDiscordWebhookController();
  const { t } = useI18n();
  const spinner = (a: Action) => c.busy === a && <Loader2Icon className="animate-spin" />;

  return (
    <Card>
      <form
        className="flex flex-1 flex-col gap-6"
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
          <CardDescription>
            {t("discord.description")}{" "}
            <Link
              to="/guide/discord"
              className="inline-flex items-center gap-1 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <CircleHelpIcon className="size-4" /> {t("discord.howTo")}
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Both webhooks side by side (stacked on phones); without a second one its slot holds the button that adds it. */}
          <div className="grid gap-4 md:grid-cols-2">
            <WebhookFields
              id="discordWebhook"
              label={t("discord.urlLabel")}
              url={c.url}
              onUrlChange={c.setUrl}
              content={c.content}
              contents={c.hasSecond ? SPLIT_CONTENTS : ALL_CONTENTS}
              onContentChange={c.setContent}
              enabled={c.enabled}
              onEnabledChange={c.setEnabled}
              onTest={c.test}
              testing={c.busy === "test"}
              busy={!!c.busy || c.loading}
            />
            {c.hasSecond ? (
              <WebhookFields
                id="discordSecondWebhook"
                label={t("discord.secondUrlLabel")}
                url={c.secondUrl}
                onUrlChange={c.setSecondUrl}
                content={c.secondContent}
                contents={SPLIT_CONTENTS}
                onContentChange={c.setSecondContent}
                enabled={c.secondEnabled}
                onEnabledChange={c.setSecondEnabled}
                onTest={c.testSecond}
                testing={c.busy === "testSecond"}
                busy={!!c.busy || c.loading}
                onRemove={c.removeSecond}
              />
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed p-4">
                <Button type="button" variant="outline" onClick={c.addSecond} disabled={!!c.busy || !c.url.trim()}>
                  <PlusIcon />
                  {t("discord.addSecond")}
                </Button>
              </div>
            )}
          </div>
          {c.error != null && (
            <Alert variant="destructive">
              <AlertCircleIcon />
              <AlertDescription>{describeError(c.error, t)}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="mt-auto flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={!!c.busy || !c.dirty || !c.canSave}>
            {spinner("save")}
            {t("discord.save")}
          </Button>
          {c.connected && (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive"
              onClick={c.disconnect}
              disabled={!!c.busy}
            >
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
