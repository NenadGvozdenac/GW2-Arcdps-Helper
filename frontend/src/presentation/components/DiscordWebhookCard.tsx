import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircleIcon, CheckIcon, CircleHelpIcon, Loader2Icon, PlusIcon, UsersIcon, XIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { DISCORD_DEFAULT_MIN_ACCOUNTS, DISCORD_MAX_FILTER_ACCOUNTS } from "../../config/constants";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
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

const postsSessions = (content: DiscordContent) => content !== "logs";

function useDiscordWebhookController(initial: DiscordWebhook[] | null, loadError: unknown) {
  const [first, second] = initial ?? [];
  const initialSessions = initial?.find((w) => postsSessions(w.content));
  /** What is saved on the server, in order; null when it couldn't be loaded (then the form can't be saved). */
  const [saved, setSaved] = useState<DiscordWebhook[] | null>(initial);
  const [url, setUrl] = useState(first?.url ?? "");
  const [content, setContent] = useState<DiscordContent>(first?.content ?? "all");
  const [enabled, setEnabled] = useState(first?.enabled ?? true);
  const [hasSecond, setHasSecond] = useState(!!second);
  const [secondUrl, setSecondUrl] = useState(second?.url ?? "");
  const [secondEnabled, setSecondEnabled] = useState(second?.enabled ?? true);
  /** The session filter belongs to whichever webhook posts sessions, so it follows that role, not a box. */
  const [filterAccounts, setFilterAccounts] = useState<string[]>(initialSessions?.accounts ?? []);
  const [minAccounts, setMinAccounts] = useState(initialSessions?.minAccounts ?? DISCORD_DEFAULT_MIN_ACCOUNTS);
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<unknown>(loadError);

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
    const sessionsWebhook = webhooks.find((w) => postsSessions(w.content));
    setFilterAccounts(sessionsWebhook?.accounts ?? []);
    setMinAccounts(sessionsWebhook?.minAccounts ?? DISCORD_DEFAULT_MIN_ACCOUNTS);
  }

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

  const filter = { accounts: filterAccounts, minAccounts };
  const noFilter = { accounts: [], minAccounts: DISCORD_DEFAULT_MIN_ACCOUNTS };
  const webhook = (url: string, content: DiscordContent, enabled: boolean): DiscordWebhook => ({
    url: url.trim(),
    content,
    enabled,
    ...(postsSessions(content) ? filter : noFilter),
  });
  const webhooks = [
    webhook(url, content, enabled),
    ...(hasSecond ? [webhook(secondUrl, otherContent(content), secondEnabled)] : []),
  ];

  return {
    /** The webhooks could not be loaded: the form stays locked so saving cannot wipe them. */
    unavailable: saved === null,
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
    filterAccounts,
    minAccounts,
    setFilter: (accounts: string[], min: number) => {
      setFilterAccounts(accounts);
      setMinAccounts(min);
    },
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
  /** Extra settings below the webhook (the session filter, on the webhook that posts sessions). */
  children?: ReactNode;
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
      {p.children}
    </div>
  );
}

interface SessionFilterProps {
  accounts: string[];
  minAccounts: number;
  onChange: (accounts: string[], minAccounts: number) => void;
  busy: boolean;
}

/**
 * Post a session only when enough of the listed GW2 accounts played in one of its logs. The card shows a summary;
 * the accounts are picked in a dialog, one at a time, and only reach the form when the dialog is applied.
 */
function SessionFilter(p: SessionFilterProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [minAccounts, setMinAccounts] = useState(DISCORD_DEFAULT_MIN_ACCOUNTS);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<unknown>(null);
  const full = accounts.length >= DISCORD_MAX_FILTER_ACCOUNTS;

  function openDialog() {
    setAccounts(p.accounts);
    setMinAccounts(p.minAccounts);
    setDraft("");
    setError(null);
    setOpen(true);
  }

  function add() {
    try {
      setAccounts(profileService.addFilterAccount(accounts, draft));
      setDraft("");
      setError(null);
    } catch (err) {
      setError(err);
    }
  }

  function apply() {
    // More than the list holds can never match; with fewer accounts than the minimum, all of them are needed.
    p.onChange(accounts, accounts.length ? Math.min(minAccounts, accounts.length) : minAccounts);
    setOpen(false);
  }

  return (
    <div className="grid gap-2 border-t pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-1">
          <Label>{t("discord.filterLabel")}</Label>
          <span className="text-sm text-muted-foreground">
            {p.accounts.length
              ? t("discord.filterSummary", { count: p.accounts.length, min: p.minAccounts })
              : t("discord.filterNone")}
          </span>
        </div>
        <Button type="button" variant="outline" onClick={openDialog} disabled={p.busy}>
          <UsersIcon />
          {t("discord.filterEdit")}
        </Button>
      </div>
      {p.accounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {p.accounts.map((a) => (
            <Badge key={a} variant="secondary">
              {a}
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("discord.filterLabel")}</DialogTitle>
            <DialogDescription>{t("discord.filterHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="discordFilterAccount">{t("discord.filterAccounts")}</Label>
              <span className="text-sm text-muted-foreground">
                {t("discord.filterLimit", { count: accounts.length, max: DISCORD_MAX_FILTER_ACCOUNTS })}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id="discordFilterAccount"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  if (!full && draft.trim()) add();
                }}
                placeholder="Name.1234"
                autoComplete="off"
                spellCheck={false}
                disabled={full}
                aria-invalid={error != null}
              />
              <Button type="button" onClick={add} disabled={full || !draft.trim()}>
                <PlusIcon />
                {t("discord.filterAdd")}
              </Button>
            </div>
            {error != null && <p className="text-sm text-destructive">{describeError(error, t)}</p>}
          </div>
          {accounts.length ? (
            <ul className="flex flex-col divide-y rounded-md border">
              {accounts.map((a) => (
                <li key={a} className="flex items-center justify-between gap-2 py-1 pr-1 pl-3 text-sm">
                  <span className="truncate">{a}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => setAccounts(accounts.filter((x) => x !== a))}
                    aria-label={t("discord.filterRemove", { account: a })}
                    title={t("discord.filterRemove", { account: a })}
                  >
                    <XIcon />
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              {t("discord.filterEmpty")}
            </p>
          )}
          {accounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor="discordFilterMin">{t("discord.filterMin")}</Label>
              <Input
                id="discordFilterMin"
                type="number"
                className="w-20"
                min={1}
                max={accounts.length}
                value={Math.min(minAccounts, accounts.length)}
                onChange={(e) =>
                  setMinAccounts(Math.min(accounts.length, Math.max(1, Math.round(+e.target.value || 1))))
                }
              />
              <span className="text-sm text-muted-foreground">{t("discord.filterMinHint")}</span>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="button" onClick={apply}>
              {t("discord.filterApply")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface DiscordWebhookCardProps {
  /** Loaded by the settings page before it shows; null when loading failed. */
  initialWebhooks: DiscordWebhook[] | null;
  loadError?: unknown;
}

export default function DiscordWebhookCard({ initialWebhooks, loadError }: DiscordWebhookCardProps) {
  const c = useDiscordWebhookController(initialWebhooks, loadError);
  const { t } = useI18n();
  const spinner = (a: Action) => c.busy === a && <Loader2Icon className="animate-spin" />;
  const sessionFilter = (
    <SessionFilter
      accounts={c.filterAccounts}
      minAccounts={c.minAccounts}
      onChange={c.setFilter}
      busy={!!c.busy || c.unavailable}
    />
  );

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
              className="inline-flex items-center gap-1 text-foreground underline-offset-4 hover:underline"
            >
              <CircleHelpIcon className="size-3.5" /> {t("discord.howTo")}
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
              busy={!!c.busy || c.unavailable}
            >
              {postsSessions(c.content) && sessionFilter}
            </WebhookFields>
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
                busy={!!c.busy || c.unavailable}
                onRemove={c.removeSecond}
              >
                {postsSessions(c.secondContent) && sessionFilter}
              </WebhookFields>
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
