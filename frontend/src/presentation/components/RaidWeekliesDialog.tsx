import { useEffect, useState, type ReactNode } from "react";
import { AlertCircleIcon, CoinsIcon, Loader2Icon, ShieldPlusIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { encounterService } from "../../services/encounterService";
import { raidRotationService } from "../../services/raidRotationService";
import type { EncounterGroup } from "../../domain/types/encounter.types";
import type { RaidWeek } from "../../domain/types/raidRotation.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/presentation/components/ui/dialog";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";

/** This week and the ones after it. */
const WEEKS_SHOWN = 6;

function WingPortrait({ wing, className }: { wing: EncounterGroup; className: string }) {
  return (
    <img
      src={encounterService.groupIcon(wing.id)}
      alt=""
      className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)}
      loading="lazy"
    />
  );
}

const TONES = {
  success: { card: "border-success/40 bg-success/5", title: "text-success" },
  warning: { card: "border-warning/40 bg-warning/5", title: "text-warning" },
};

/** This week's wing for one of the two rotations, with what it does. */
function ThisWeekCard({
  icon,
  title,
  hint,
  wing,
  tone,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  wing: EncounterGroup;
  tone: keyof typeof TONES;
}) {
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4", TONES[tone].card)}>
      <span className={cn("flex items-center gap-2 text-sm font-medium", TONES[tone].title)}>
        {icon} {title}
      </span>
      <div className="flex items-center gap-3">
        <WingPortrait wing={wing} className="size-12" />
        <div className="min-w-0">
          <span className="block text-lg font-semibold">{wing.name}</span>
          <span className="block text-sm text-muted-foreground">{wing.short}</span>
        </div>
      </div>
      <p className="text-sm text-pretty text-muted-foreground">{hint}</p>
    </div>
  );
}

function WingCell({ wing }: { wing: EncounterGroup }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <WingPortrait wing={wing} className="size-6" />
      <span className="font-mono text-xs text-muted-foreground">{wing.short}</span>
      <span className="truncate">{wing.name}</span>
    </span>
  );
}

/** This week's and the coming weeks' rotation, from the backend. */
function useRaidWeekliesController() {
  const [weeks, setWeeks] = useState<RaidWeek[] | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    raidRotationService
      .weeks(WEEKS_SHOWN)
      .then((w) => active && setWeeks(w))
      .catch((e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, []);

  return { weeks, error };
}

/**
 * The raid weeklies: which wing has Emboldened mode and which has Call of the Mists this week, and the coming weeks.
 * Both rotate through W1–W8 every Monday at 08:30 UTC; the backend works out the rotation.
 */
export default function RaidWeekliesDialog({ onClose }: { onClose: () => void }) {
  const { t, fmt } = useI18n();
  const { weeks, error } = useRaidWeekliesController();
  const [current, ...next] = weeks ?? [];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90svh] flex-col gap-4 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("raidWeeklies.title")}</DialogTitle>
          <DialogDescription>
            {current
              ? t("raidWeeklies.description", { time: fmt.countdown(current.end.getTime() - Date.now()) })
              : t("raidWeeklies.descriptionLoading")}
          </DialogDescription>
        </DialogHeader>

        {error != null && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertDescription>{t("raidWeeklies.loadError", { error: describeError(error, t) })}</AlertDescription>
          </Alert>
        )}
        {!current && error == null && (
          <div className="grid place-items-center py-12" role="status" aria-busy="true">
            <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {current && (
          <div className="-mx-1 flex flex-col gap-5 overflow-y-auto px-1 pb-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <ThisWeekCard
                icon={<ShieldPlusIcon className="size-4" />}
                title={t("raidWeeklies.emboldened")}
                hint={t("raidWeeklies.emboldenedHint")}
                wing={current.emboldened}
                tone="success"
              />
              <ThisWeekCard
                icon={<CoinsIcon className="size-4" />}
                title={t("raidWeeklies.callOfTheMists")}
                hint={t("raidWeeklies.callOfTheMistsHint")}
                wing={current.callOfTheMists}
                tone="warning"
              />
            </div>

            <section className="flex flex-col gap-2" aria-labelledby="raid-weeklies-next">
              <h3 id="raid-weeklies-next" className="text-sm font-medium text-muted-foreground">
                {t("raidWeeklies.nextWeeks")}
              </h3>
              <div className="overflow-hidden rounded-xl border">
                <div className="hidden grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 border-b bg-muted/30 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase sm:grid">
                  <span>{t("raidWeeklies.week")}</span>
                  <span>{t("raidWeeklies.emboldened")}</span>
                  <span>{t("raidWeeklies.callOfTheMists")}</span>
                </div>
                <ul className="divide-y">
                  {next.map((w) => (
                    <li
                      key={w.start.getTime()}
                      className="grid gap-2 px-4 py-2.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)_minmax(0,1fr)] sm:items-center sm:gap-3"
                    >
                      <span className="text-muted-foreground">{fmt.date(w.start)}</span>
                      <WingCell wing={w.emboldened} />
                      <WingCell wing={w.callOfTheMists} />
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
