import { useEffect, useMemo, useState } from "react";
import { AlertCircleIcon } from "lucide-react";
import { useAuth } from "../../controllers/AuthController";
import { useI18n } from "../../controllers/I18nController";
import { instabilityRepository } from "../../repositories/instabilityRepository";
import { instabilityService } from "../../services/instabilityService";
import type {
  FractalInstabilities,
  Instability,
  InstabilityData,
  InstabilityHighlight,
} from "../../domain/types/instability.types";
import { Alert, AlertDescription } from "@/presentation/components/ui/alert";
import { cn } from "@/presentation/lib/utils";
import { describeError } from "../utils/describeError";

/**
 * Today's instabilities of the CM fractals (per fractal, per instability, the No Pain, No Gain ones), the dailies and
 * recs, and the user's play order.
 */
export function useTodayInstabilities() {
  const { lang } = useI18n();
  const { user } = useAuth();
  const playOrder = user?.fractalPlayOrder;
  const hidden = user?.fractalPlayOrderHidden;
  const [data, setData] = useState<InstabilityData | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    let active = true;
    instabilityRepository
      .all()
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(e));
    return () => {
      active = false;
    };
  }, []);

  const fractals = useMemo(() => (data ? instabilityService.forToday(data, lang) : []), [data, lang]);
  const byInstability = useMemo(() => instabilityService.byInstability(fractals), [fractals]);
  const noPainNoGain = byInstability.find((i) => i.instability.isNoPainNoGain)?.fractals ?? [];
  const byGroup = useMemo(() => new Map(fractals.map((f) => [f.group.id, f])), [fractals]);
  const byLevel = useMemo(() => new Map(fractals.map((f) => [f.level, f])), [fractals]);
  const dailyT4 = useMemo(() => (data ? instabilityService.dailyT4(data, lang) : []), [data, lang]);
  const recommended = useMemo(() => (data ? instabilityService.recommended(data, lang) : []), [data, lang]);

  return {
    loading: !data && error == null,
    error,
    fractals,
    byInstability,
    noPainNoGain,
    byGroup,
    byLevel,
    dailyT4,
    recommended,
    /** The user's play order without the entries they left out (CM levels, PLAY_ORDER_DAILIES, PLAY_ORDER_RECS). */
    playSequence: instabilityService.playSequence(playOrder, hidden),
  };
}

/** Classes for an instability's row / name / card by its highlight: red (No Pain, No Gain), yellow (Last Laugh). */
export const HIGHLIGHT_ROW: Record<NonNullable<InstabilityHighlight>, string> = {
  danger: "bg-destructive/10 font-medium text-destructive",
  warning: "bg-warning/10 font-medium text-warning",
};
export const HIGHLIGHT_TEXT: Record<NonNullable<InstabilityHighlight>, string> = {
  danger: "text-destructive",
  warning: "text-warning",
};
export const HIGHLIGHT_CARD: Record<NonNullable<InstabilityHighlight>, string> = {
  danger: "border-destructive/40 bg-destructive/5",
  warning: "border-warning/40 bg-warning/5",
};

export function BossPortrait({ fractal, className }: { fractal: FractalInstabilities; className?: string }) {
  return (
    <img
      src={fractal.icon}
      alt=""
      className={cn("shrink-0 rounded-full object-cover ring-1 ring-border", className)}
      loading="lazy"
    />
  );
}

export function InstabilityIcon({ instability, className }: { instability: Instability; className?: string }) {
  return <img src={instability.icon} alt="" className={cn("shrink-0", className)} loading="lazy" />;
}

/** Marks a CM fractal that is also one of today's dailies. */
export function DailyBadge() {
  const { t } = useI18n();
  return (
    <span className="rounded-md border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-primary">
      {t("instabilities.dailyBadge")}
    </span>
  );
}

export function LevelBadge({ fractal }: { fractal: FractalInstabilities }) {
  return (
    <span className="rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold text-muted-foreground tabular-nums">
      {fractal.group.short}
    </span>
  );
}

/**
 * A fractal's instabilities with their icons, one per row (`columns`: side by side in three equal columns, so rows of
 * them line up); No Pain, No Gain in red, Last Laugh in yellow.
 */
export function InstabilityList({ instabilities, columns }: { instabilities: Instability[]; columns?: boolean }) {
  const { t } = useI18n();
  if (instabilities.length === 0) {
    return <span className="text-sm text-muted-foreground">{t("instabilities.none")}</span>;
  }
  return (
    <ul className={columns ? "grid gap-1.5 sm:grid-cols-3" : "flex flex-col gap-1"}>
      {instabilities.map((i) => (
        <li
          key={i.id}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-sm",
            i.highlight ? HIGHLIGHT_ROW[i.highlight] : "bg-background/60",
          )}
        >
          <InstabilityIcon instability={i} className="size-5" />
          {i.name}
        </li>
      ))}
    </ul>
  );
}

/** Which fractals have No Pain, No Gain today, at a glance. */
export function NoPainNoGainBar({ fractals }: { fractals: FractalInstabilities[] }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      {fractals.length === 0 ? (
        <span className="text-muted-foreground">{t("instabilities.noPainNoGainNone")}</span>
      ) : (
        <>
          <span className="font-medium">{t("instabilities.noPainNoGainToday")}</span>
          {fractals.map((f) => (
            <span
              key={f.group.id}
              className="flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 py-0.5 pr-2 pl-0.5 text-xs font-medium text-destructive"
            >
              <BossPortrait fractal={f} className="size-5" />
              {f.group.short}
            </span>
          ))}
        </>
      )}
    </div>
  );
}

export function InstabilitiesError({ error }: { error: unknown }) {
  const { t } = useI18n();
  return (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertDescription>{t("instabilities.loadError", { error: describeError(error, t) })}</AlertDescription>
    </Alert>
  );
}
