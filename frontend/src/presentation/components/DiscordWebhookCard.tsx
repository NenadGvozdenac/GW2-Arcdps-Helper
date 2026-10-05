import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircleIcon,
  CheckIcon,
  CircleHelpIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  UserXIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import {
  DISCORD_DEFAULT_MIN_ACCOUNTS,
  DISCORD_MAX_FILTER_ACCOUNTS,
  DISCORD_WEBHOOK_NAME_MAX,
} from "../../config/constants";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { describeError } from "../utils/describeError";
import { successBadge } from "./ResultBadge";

type Action = "save" | "test0" | "test1" | "disconnect";

const CONTENT_LABELS: Record<DiscordContent, TranslationKey> = {
  all: "discord.contentAll",
  logs: "discord.contentLogs",
  sessions: "discord.contentSessions",
};

const ALL_CONTENTS: DiscordContent[] = ["all", "logs", "sessions"];
/** With two webhooks each posts one kind (both may post the same one). */
const SPLIT_CONTENTS: DiscordContent[] = ["logs", "sessions"];

/** A webhook not filled in yet; same key order as the API's, so the form can tell when it differs from the saved one. */
const blankWebhook = (content: DiscordContent): DiscordWebhook => ({
  name: "",
  url: "",
  content,
  enabled: true,
  accounts: [],
  minAccounts: DISCORD_DEFAULT_MIN_ACCOUNTS,
  excludedAccounts: [],
});

/** The form always shows at least the first webhook. */
const toDrafts = (webhooks: DiscordWebhook[]) => (webhooks.length ? webhooks : [blankWebhook("all")]);

function useDiscordWebhookController(initial: DiscordWebhook[] | null, loadError: unknown) {
  /** What is saved on the server, in order; null when it couldn't be loaded (then the form can't be saved). */
  const [saved, setSaved] = useState<DiscordWebhook[] | null>(initial);
  /** The webhooks as edited in the form: the first one, and the second when added. */
  const [drafts, setDrafts] = useState<DiscordWebhook[]>(toDrafts(initial ?? []));
  const [busy, setBusy] = useState<Action | null>(null);
  const [notice, setNotice] = useState<TranslationKey | null>(null);
  const [error, setError] = useState<unknown>(loadError);

  /** Shows the saved webhooks in the form. */
  function load(webhooks: DiscordWebhook[]) {
    setSaved(webhooks);
    setDrafts(toDrafts(webhooks));
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

  const update = (index: number, patch: Partial<DiscordWebhook>) =>
    setDrafts((list) => list.map((w, i) => (i === index ? { ...w, ...patch } : w)));
  const webhooks = drafts.map((w) => ({ ...w, name: w.name.trim(), url: w.url.trim() }));

  return {
    /** The webhooks could not be loaded: the form stays locked so saving cannot wipe them. */
    unavailable: saved === null,
    drafts,
    update,
    /**
     * With a second webhook each posts only logs or only sessions: "Logs + sessions" on the first becomes "Logs", and
     * the second starts with the other kind.
     */
    addSecond: () =>
      setDrafts(([first]) => [
        first.content === "all" ? { ...first, content: "logs" } : first,
        blankWebhook(first.content === "sessions" ? "logs" : "sessions"),
      ]),
    removeSecond: () => setDrafts(([first]) => [first]),
    busy,
    notice,
    error,
    connected: !!saved?.length,
    dirty: saved !== null && JSON.stringify(webhooks) !== JSON.stringify(saved),
    canSave: webhooks.every((w) => w.url),
    save: () => run("save", async () => load(await profileService.setDiscordWebhooks(webhooks)), "discord.saved"),
    test: (index: number) =>
      run(
        index ? "test1" : "test0",
        () => profileService.testDiscordWebhook(drafts[index].url, drafts[index].content),
        "discord.testSent",
      ),
    disconnect: () =>
      run("disconnect", async () => load(await profileService.setDiscordWebhooks([])), "discord.disconnected"),
  };
}

interface WebhookFieldsProps {
  id: string;
  /** Shown when the webhook has no name of its own. */
  label: string;
  name: string;
  onNameChange: (name: string) => void;
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
  /** Extra settings below the webhook (its filters). */
  children?: ReactNode;
}

/**
 * The webhook's title — its own name, or `label` without one — with a pencil to rename it in place (Enter applies,
 * Escape cancels), like a session's title. The name is saved with the rest of the form.
 */
function WebhookName(p: { id: string; label: string; name: string; onChange: (name: string) => void; busy: boolean }) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function start() {
    setDraft(p.name);
    setEditing(true);
  }

  function apply() {
    p.onChange(draft.trim());
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1">
        <Label htmlFor={p.id} className="truncate">
          {p.name || p.label}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={start}
          disabled={p.busy}
          aria-label={t("discord.rename")}
          title={t("discord.rename")}
        >
          <PencilIcon />
        </Button>
      </div>
    );
  }

  // Not a <form>: it sits inside the settings form, so Enter is handled here instead of submitting that one.
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <Input
        autoFocus
        value={draft}
        maxLength={DISCORD_WEBHOOK_NAME_MAX}
        placeholder={t("discord.namePlaceholder")}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            apply();
          } else if (e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        className="h-7 min-w-0"
        aria-label={t("discord.rename")}
      />
      <Button type="button" size="icon" className="size-7 shrink-0" onClick={apply} aria-label={t("common.save")}>
        <CheckIcon />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-7 shrink-0"
        onClick={() => setEditing(false)}
        aria-label={t("common.cancel")}
      >
        <XIcon />
      </Button>
    </div>
  );
}

/** One webhook: its URL, what it posts and a test message — the same for the first and the second one. */
function WebhookFields(p: WebhookFieldsProps) {
  const { t } = useI18n();
  return (
    // Two columns: the buttons (test, filters) share the right one, so they are all as wide as the widest of them.
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-3 rounded-md border p-4">
      <div className="col-span-2 flex min-h-7 items-center justify-between gap-2">
        <WebhookName id={p.id} label={p.label} name={p.name} onChange={p.onNameChange} busy={p.busy} />
        <div className="flex shrink-0 items-center gap-1">
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
        className="col-span-2"
      />
      <div className="col-span-2 grid grid-cols-subgrid items-center gap-y-2">
        <Label htmlFor={`${p.id}Content`} className="col-span-2">
          {t("discord.contentLabel")}
        </Label>
        {/* The test button sits on the dropdown's row, in the buttons' column. */}
        <Select value={p.content} onValueChange={(v) => p.onContentChange(v as DiscordContent)} disabled={p.busy}>
          <SelectTrigger id={`${p.id}Content`} className="w-full max-w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {p.contents.map((v) => (
              <SelectItem key={v} value={v}>
                {t(CONTENT_LABELS[v])}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" className="w-full" onClick={p.onTest} disabled={p.busy || !p.url.trim()}>
          {/* Always an icon, so the spinner swaps in without widening the button (which would wrap it). */}
          {p.testing ? <Loader2Icon className="animate-spin" /> : <SendIcon />}
          {t("discord.test")}
        </Button>
      </div>
      {p.children}
    </div>
  );
}

/** Dialog hint of each filter, per what the webhook posts. */
const FILTER_HINTS: Record<"group" | "exclude", Record<DiscordContent, TranslationKey>> = {
  group: {
    all: "discord.filterHintAll",
    logs: "discord.filterHintLogs",
    sessions: "discord.filterHintSessions",
  },
  exclude: {
    all: "discord.excludeHintAll",
    logs: "discord.excludeHintLogs",
    sessions: "discord.excludeHintSessions",
  },
};

interface AccountFilterProps {
  /** Unique per webhook and filter, for the dialog's input ids. */
  id: string;
  /** "group": post only with enough of these accounts; "exclude": never post with any of them. */
  kind: "group" | "exclude";
  content: DiscordContent;
  accounts: string[];
  /** Only for "group". */
  minAccounts?: number;
  /** The webhook's other list: an account can't be on both. */
  otherAccounts: string[];
  onChange: (accounts: string[], minAccounts: number) => void;
  busy: boolean;
}

/**
 * One filter of a webhook: its group (post only when enough of these GW2 accounts played) or its excluded accounts
 * (never post when any of them played). The card shows a summary; the accounts are picked in a dialog, one at a time,
 * and only reach the form when the dialog is applied.
 */
function AccountFilter(p: AccountFilterProps) {
  const { t } = useI18n();
  const group = p.kind === "group";
  const [open, setOpen] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [minAccounts, setMinAccounts] = useState(DISCORD_DEFAULT_MIN_ACCOUNTS);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<unknown>(null);
  const full = accounts.length >= DISCORD_MAX_FILTER_ACCOUNTS;
  const savedMin = p.minAccounts ?? DISCORD_DEFAULT_MIN_ACCOUNTS;
  const title = t(group ? "discord.filterLabel" : "discord.excludeLabel");

  function openDialog() {
    setAccounts(p.accounts);
    setMinAccounts(savedMin);
    setDraft("");
    setError(null);
    setOpen(true);
  }

  function add() {
    try {
      setAccounts(profileService.addFilterAccount(accounts, draft, p.otherAccounts));
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

  const summary = !p.accounts.length
    ? t(group ? "discord.filterNone" : "discord.excludeNone")
    : group
      ? t("discord.filterSummary", { count: p.accounts.length, min: savedMin })
      : t("discord.excludeSummary", { count: p.accounts.length });

  return (
    // A row of the webhook's two-column grid: the button fills the buttons' column, as wide as the test button.
    <div className="col-span-2 grid grid-cols-subgrid items-center gap-y-2 border-t pt-3">
      <div className="grid gap-1">
        <Label>{title}</Label>
        <span className="text-sm text-muted-foreground">{summary}</span>
      </div>
      <Button type="button" variant="outline" className="w-full" onClick={openDialog} disabled={p.busy}>
        {group ? <UsersIcon /> : <UserXIcon />}
        {t(group ? "discord.filterEdit" : "discord.excludeEdit")}
      </Button>
      {p.accounts.length > 0 && (
        <div className="col-span-2 flex flex-wrap gap-1.5">
          {p.accounts.map((a) => (
            <Badge key={a} variant={group ? "secondary" : "outline"}>
              {a}
            </Badge>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{t(FILTER_HINTS[p.kind][p.content])}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={`${p.id}Account`}>{t("discord.filterAccounts")}</Label>
              <span className="text-sm text-muted-foreground">
                {t("discord.filterLimit", {
                  count: accounts.length,
                  max: DISCORD_MAX_FILTER_ACCOUNTS,
                })}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                id={`${p.id}Account`}
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
              {t(group ? "discord.filterEmpty" : "discord.excludeEmpty")}
            </p>
          )}
          {group && accounts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Label htmlFor={`${p.id}Min`}>{t("discord.filterMin")}</Label>
              <Input
                id={`${p.id}Min`}
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

/** Both filters of one webhook (its group and its excluded accounts), below its settings. */
function WebhookFilters({
  id,
  webhook,
  onChange,
  busy,
}: {
  id: string;
  webhook: DiscordWebhook;
  onChange: (patch: Partial<DiscordWebhook>) => void;
  busy: boolean;
}) {
  return (
    <>
      <AccountFilter
        id={`${id}Group`}
        kind="group"
        content={webhook.content}
        accounts={webhook.accounts}
        minAccounts={webhook.minAccounts}
        otherAccounts={webhook.excludedAccounts}
        onChange={(accounts, minAccounts) => onChange({ accounts, minAccounts })}
        busy={busy}
      />
      <AccountFilter
        id={`${id}Exclude`}
        kind="exclude"
        content={webhook.content}
        accounts={webhook.excludedAccounts}
        otherAccounts={webhook.accounts}
        onChange={(excludedAccounts) => onChange({ excludedAccounts })}
        busy={busy}
      />
    </>
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
  const locked = !!c.busy || c.unavailable;
  const [first, second] = c.drafts;

  /** One webhook's box with its filters; `index` 0 is the first webhook, 1 the second. */
  const webhookBox = (w: DiscordWebhook, index: number) => {
    const id = index ? "discordSecondWebhook" : "discordWebhook";
    return (
      <WebhookFields
        id={id}
        label={t(index ? "discord.secondUrlLabel" : "discord.urlLabel")}
        name={w.name}
        onNameChange={(name) => c.update(index, { name })}
        url={w.url}
        onUrlChange={(url) => c.update(index, { url })}
        content={w.content}
        contents={second ? SPLIT_CONTENTS : ALL_CONTENTS}
        onContentChange={(content) => c.update(index, { content })}
        enabled={w.enabled}
        onEnabledChange={(enabled) => c.update(index, { enabled })}
        onTest={() => c.test(index)}
        testing={c.busy === (index ? "test1" : "test0")}
        busy={locked}
        onRemove={index ? c.removeSecond : undefined}
      >
        <WebhookFilters id={id} webhook={w} onChange={(patch) => c.update(index, patch)} busy={locked} />
      </WebhookFields>
    );
  };

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
            {webhookBox(first, 0)}
            {second ? (
              webhookBox(second, 1)
            ) : (
              <div className="flex min-h-40 items-center justify-center rounded-md border border-dashed p-4">
                <Button type="button" variant="outline" onClick={c.addSecond} disabled={!!c.busy || !first.url.trim()}>
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
