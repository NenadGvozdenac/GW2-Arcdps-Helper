import { useState, type ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { PLAY_ORDER_DAILIES, PLAY_ORDER_RECS } from "../../services/instabilityService";
import { instabilitiesGroupByStorage } from "../../storage/instabilitiesGroupByStorage";
import type {
  DailyFractal,
  FractalInstabilities,
  Instability,
  InstabilityFractals,
  InstabilityGroupBy,
} from "../../domain/types/instability.types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { cn } from "@/presentation/lib/utils";
import {
  BossPortrait,
  DailyBadge,
  HIGHLIGHT_CARD,
  HIGHLIGHT_TEXT,
  InstabilitiesError,
  InstabilityIcon,
  InstabilityList,
  LevelBadge,
  NoPainNoGainBar,
  useTodayInstabilities,
} from "./Instabilities";

/** One fractal: its boss portrait, its level and today's instabilities (No Pain, No Gain red, Last Laugh yellow). */
function FractalCard({ fractal }: { fractal: FractalInstabilities }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <BossPortrait fractal={fractal} className="size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-semibold">{fractal.group.name}</span>
            <span className="flex shrink-0 items-center gap-1">
              {fractal.isDaily && <DailyBadge />}
              <LevelBadge fractal={fractal} />
            </span>
          </div>
        </div>
      </div>
      <InstabilityList instabilities={fractal.instabilities} />
    </li>
  );
}

/** One instability and the fractals that have it today. */
function InstabilityCard({ entry }: { entry: InstabilityFractals }) {
  const { t } = useI18n();
  const { instability, fractals } = entry;
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-3",
        instability.highlight ? HIGHLIGHT_CARD[instability.highlight] : "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-3">
        <InstabilityIcon instability={instability} className="size-9" />
        <div className="min-w-0">
          <span
            className={cn(
              "block truncate font-semibold",
              instability.highlight && HIGHLIGHT_TEXT[instability.highlight],
            )}
          >
            {instability.name}
          </span>
          <span className="block text-xs text-muted-foreground">
            {t("instabilities.fractalCount", { count: fractals.length })}
          </span>
        </div>
      </div>
      <ul className="flex flex-col gap-1">
        {fractals.map((f) => (
          <li key={f.group.id} className="flex items-center gap-2 rounded-md bg-background/60 px-2 py-1 text-sm">
            <BossPortrait fractal={f} className="size-5" />
            <span className="min-w-0 flex-1 truncate">{f.group.name}</span>
            <LevelBadge fractal={f} />
          </li>
        ))}
      </ul>
    </li>
  );
}

/** A small outlined label (e.g. "Dailies"). */
function TextBadge({ children }: { children: ReactNode }) {
  return (
    <span className="shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold text-muted-foreground">
      {children}
    </span>
  );
}

/** One entry in play order, a row across the dialog: the fractal on the left, its instabilities in aligned columns. */
function PlayOrderRow({
  icon,
  title,
  badges,
  instabilities,
  dashed,
}: {
  icon: ReactNode;
  title: string;
  badges: ReactNode;
  instabilities: Instability[];
  dashed?: boolean;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-muted/30 p-3 md:flex-row md:items-center",
        dashed && "border-dashed",
      )}
    >
      <div className="flex min-w-0 items-center gap-3 md:w-80 md:shrink-0">
        {icon}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{title}</span>
            {badges}
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <InstabilityList instabilities={instabilities} columns />
      </div>
    </li>
  );
}

/** One of today's T4 dailies or recs: its level, name and instabilities; `badge` marks it among the CM fractals. */
function DailyCard({ fractal, badge }: { fractal: DailyFractal; badge?: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-xl border border-dashed bg-muted/30 p-3">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-background text-sm font-semibold tabular-nums ring-1 ring-border">
          {fractal.level}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold">{fractal.name}</span>
        {badge && (
          <span className="rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <InstabilityList instabilities={fractal.instabilities} />
    </li>
  );
}

/**
 * Today's instabilities: the CM fractals in two columns (per fractal, or per instability with No Pain, No Gain and
 * Last Laugh first) and today's T4 dailies in a third; in play order, the user's sequence of CM fractals, dailies and
 * recs (without the ones they left out).
 */
export default function FractalInstabilitiesDialog({ onClose }: { onClose: () => void }) {
  const c = useTodayInstabilities();
  const { t } = useI18n();
  // Remembered in this browser.
  const [groupBy, setGroupByState] = useState<InstabilityGroupBy>(instabilitiesGroupByStorage.get);
  const setGroupBy = (next: InstabilityGroupBy) => {
    instabilitiesGroupByStorage.set(next);
    setGroupByState(next);
  };
  const ready = !c.loading && c.error == null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-4 sm:max-w-3xl lg:max-w-6xl">
        <DialogHeader className="flex-col gap-3 pr-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <DialogTitle>{t("instabilities.title")}</DialogTitle>
            <DialogDescription>{t("instabilities.description")}</DialogDescription>
          </div>
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as InstabilityGroupBy)}>
            <SelectTrigger size="sm" className="shrink-0" aria-label={t("instabilities.groupBy")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fractal">{t("instabilities.byFractal")}</SelectItem>
              <SelectItem value="instability">{t("instabilities.byInstability")}</SelectItem>
              <SelectItem value="playOrder">{t("instabilities.playOrder")}</SelectItem>
            </SelectContent>
          </Select>
        </DialogHeader>

        {c.loading && (
          <div className="grid place-items-center py-12" role="status" aria-busy="true">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {c.error != null && <InstabilitiesError error={c.error} />}

        {ready && (
          <>
            <NoPainNoGainBar fractals={c.noPainNoGain} />
            {groupBy === "playOrder" ? (
              <ol className="-mx-1 flex flex-col gap-2 overflow-y-auto px-1 pb-1">
                {c.playSequence.flatMap((entry) => {
                  if (entry === PLAY_ORDER_DAILIES || entry === PLAY_ORDER_RECS) {
                    const recs = entry === PLAY_ORDER_RECS;
                    return (recs ? c.recommended : c.dailyT4).map((f) => (
                      <PlayOrderRow
                        key={`${recs ? "rec" : "daily"}-${f.level}`}
                        dashed
                        icon={
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-sm font-semibold tabular-nums ring-1 ring-border">
                            {f.level}
                          </span>
                        }
                        title={f.name}
                        badges={<TextBadge>{t(recs ? "fractalPlayOrder.recs" : "fractalPlayOrder.dailies")}</TextBadge>}
                        instabilities={f.instabilities}
                      />
                    ));
                  }
                  const fractal = c.byLevel.get(entry);
                  if (!fractal) return [];
                  return [
                    <PlayOrderRow
                      key={fractal.group.id}
                      icon={<BossPortrait fractal={fractal} className="size-10" />}
                      title={fractal.group.name}
                      badges={
                        <>
                          {fractal.isDaily && <DailyBadge />}
                          <LevelBadge fractal={fractal} />
                        </>
                      }
                      instabilities={fractal.instabilities}
                    />,
                  ];
                })}
              </ol>
            ) : (
              <div className="-mx-1 grid items-start gap-x-3 gap-y-5 overflow-y-auto px-1 pb-1 lg:grid-cols-3">
                <section className="flex flex-col gap-2 lg:col-span-2" aria-labelledby="instabilities-cm">
                  <h3 id="instabilities-cm" className="text-sm font-medium text-muted-foreground">
                    {t("instabilities.cmHeading")}
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {groupBy === "instability"
                      ? c.byInstability.map((e) => <InstabilityCard key={e.instability.id} entry={e} />)
                      : c.fractals.map((f) => <FractalCard key={f.group.id} fractal={f} />)}
                  </ul>
                </section>
                <section className="flex flex-col gap-2" aria-labelledby="instabilities-t4">
                  <h3 id="instabilities-t4" className="text-sm font-medium text-muted-foreground">
                    {t("instabilities.t4Heading")}
                  </h3>
                  <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    {c.dailyT4.map((f) => (
                      <DailyCard key={f.level} fractal={f} />
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
