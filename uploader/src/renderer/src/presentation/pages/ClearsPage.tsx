import { CheckIcon } from "lucide-react";
import { useAppState } from "../../controllers/AppStateController";
import { useI18n } from "../../controllers/I18nController";
import { localeFor } from "../../i18n/translate";
import type { WeeklyClears } from "../../../../shared/backend.types";
import { cn } from "@/presentation/lib/utils";

const HOUR_MS = 60 * 60 * 1000;

/** "in 3 days" / "in 5 hours" in the app language. */
function relativeReset(nextResetAt: string, locale: string): string {
  const ms = new Date(nextResetAt).getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const hours = Math.max(1, Math.round(ms / HOUR_MS));
  return hours >= 48 ? rtf.format(Math.round(hours / 24), "day") : rtf.format(hours, "hour");
}

function useClearsPageController() {
  const { clears } = useAppState();
  const { lang } = useI18n();
  if (!clears) return null;
  const bosses = clears.groups.flatMap((g) => g.bosses);
  return {
    groups: clears.groups,
    cleared: bosses.filter((b) => b.cleared).length,
    total: bosses.length,
    resetsIn: relativeReset(clears.nextResetAt, localeFor(lang)),
  };
}

function WingCard({ group }: { group: WeeklyClears["groups"][number] }) {
  const cleared = group.bosses.filter((b) => b.cleared).length;
  const done = cleared === group.bosses.length;
  // Windows lower than 700 px (the minimum is 600) get a tighter layout, so the page never scrolls.
  return (
    <div
      className={cn(
        "flex min-h-0 flex-col rounded-xl border bg-card px-4 py-3 shadow-sm [@media(max-height:700px)]:py-2",
        done && "border-success/40 bg-success/5",
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2 text-sm font-semibold [@media(max-height:700px)]:mb-1">
        <span className="truncate" title={group.name}>
          {group.short} <span className="font-normal text-muted-foreground">{group.name}</span>
        </span>
        <span className={cn("shrink-0 font-mono text-xs", done ? "text-success" : "text-muted-foreground")}>
          {cleared}/{group.bosses.length}
        </span>
      </div>
      <ul className="flex flex-col gap-2 [@media(max-height:700px)]:gap-1">
        {group.bosses.map((b) => (
          <li
            key={b.key}
            className={cn(
              "flex items-center gap-2 text-sm leading-5 [@media(max-height:700px)]:text-xs [@media(max-height:700px)]:leading-4",
              b.cleared ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "grid size-4 shrink-0 place-items-center rounded-full",
                b.cleared ? "bg-success text-background" : "border border-muted-foreground/40",
              )}
            >
              {b.cleared && <CheckIcon className="size-3" strokeWidth={3} />}
            </span>
            <span className="truncate" title={b.name}>
              {b.name}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Wings W1–W8 and VoE with the bosses killed since the weekly reset (from the uploader, the addon and the website). */
export default function ClearsPage() {
  const c = useClearsPageController();
  const { t } = useI18n();

  return (
    // Fills the window below the header exactly: the rows share the height, so nothing scrolls.
    <div className="flex h-full min-h-0 flex-col gap-4 [@media(max-height:700px)]:gap-2">
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 space-y-0.5">
          <h1 className="text-lg font-semibold tracking-tight">{t("clears.title")}</h1>
          <p className="text-xs text-muted-foreground">
            {c ? t("clears.resets", { when: c.resetsIn }) : t("clears.loading")}
          </p>
        </div>
        {c && (
          <span className="font-mono text-2xl font-semibold tracking-tight">
            {c.cleared}
            <span className="text-muted-foreground">/{c.total}</span>
          </span>
        )}
      </div>
      {c && (
        <div className="grid min-h-0 flex-1 auto-rows-[minmax(min-content,1fr)] grid-cols-3 gap-3 [@media(max-height:700px)]:gap-2">
          {c.groups.map((g) => (
            <WingCard key={g.id} group={g} />
          ))}
        </div>
      )}
    </div>
  );
}
