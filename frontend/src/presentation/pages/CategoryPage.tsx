import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDaysIcon, CheckIcon, HistoryIcon, Loader2Icon, StarIcon, XIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { PLAY_ORDER_DAILIES, PLAY_ORDER_RECS, instabilityService } from "../../services/instabilityService";
import { statsService } from "../../services/statsService";
import { fractalOrderStorage } from "../../storage/fractalOrderStorage";
import type { Category, Encounter, EncounterGroup } from "../../domain/types/encounter.types";
import type { DailyFractal, FractalOrder } from "../../domain/types/instability.types";
import type { CmMode } from "../../domain/types/log.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import BossRow from "../components/BossRow";
import {
  DailyBadge,
  InstabilitiesError,
  InstabilityList,
  NoPainNoGainBar,
  useTodayInstabilities,
} from "../components/Instabilities";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

type PageCategory = Exclude<Category, "other">;

/** How often the page re-checks the reset (so the numbers reset by themselves while it stays open). */
const CLOCK_TICK_MS = 60_000;

/** The current time, updated every minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(id);
  }, []);
  return now;
}

const MODES: { value: CmMode; label: TranslationKey }[] = [
  { value: "all", label: "categories.modeAll" },
  { value: "normal", label: "categories.modeNormal" },
  { value: "cm", label: "categories.modeCm" },
];

/** The page's controls, shared by every category it shows: CM mode, the previous period, the open boss (?boss=). */
function usePageState() {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<CmMode>("all");
  const [showPrevious, setShowPrevious] = useState(false);
  // Fractals only: by level or in play order, remembered in this browser.
  const [fractalOrder, setFractalOrderState] = useState<FractalOrder>(fractalOrderStorage.get);
  const setFractalOrder = (next: FractalOrder) => {
    fractalOrderStorage.set(next);
    setFractalOrderState(next);
  };
  const selectedBoss = params.get("boss");
  const now = useNow();

  function toggleBoss(key: string) {
    const next = new URLSearchParams(params);
    if (selectedBoss === key) next.delete("boss");
    else next.set("boss", key);
    setParams(next, { replace: true });
  }

  return {
    mode,
    setMode,
    showPrevious,
    togglePrevious: () => setShowPrevious((v) => !v),
    fractalOrder,
    setFractalOrder,
    selectedBoss,
    toggleBoss,
    now,
  };
}

type PageState = ReturnType<typeof usePageState>;

/** One category's numbers since its reset, its previous period's logs and its groups with their bosses. */
function useCategoryView(category: PageCategory, mode: CmMode, now: Date) {
  const { logs } = useLogs();

  return useMemo(() => {
    // Everything — the cards and each boss's row — counts from the last reset: daily for fractals, weekly for raids
    // and strikes. Older logs are under "Yesterday" / "Last week".
    const resetAt = statsService.resetFor(category, now);
    const nextResetAt = statsService.nextResetFor(category, now);
    const byEncounter = statsService.logsByEncounter(logs, category, mode);
    // In CM mode, bosses without a Challenge Mote (VG, Gorseval, IBS strikes…) are left out entirely.
    const hasMode = (e: Encounter) => mode !== "cm" || !e.noCM;
    const encounters = encounterService.encountersFor(category).filter(hasMode);
    const allLogs = [...byEncounter.values()].flat();
    const cleared = statsService.clearedSince(allLogs, resetAt);
    const sinceReset = statsService.encounterStats(statsService.logsBetween(allLogs, resetAt));
    const previousFrom = statsService.previousResetFor(category, now);

    const groups = encounterService
      .groupsFor(category)
      .map((group) => ({
        group,
        bosses: encounterService
          .encountersInGroup(group.id)
          .filter(hasMode)
          .map((encounter) => {
            const bossLogs = statsService.logsBetween(byEncounter.get(encounter.key) ?? [], resetAt);
            return {
              encounter,
              logs: bossLogs,
              stats: statsService.encounterStats(bossLogs),
              clearedSinceReset: cleared.has(encounter.key),
            };
          }),
      }))
      .filter((g) => g.bosses.length > 0);

    return {
      groups,
      previous: { from: previousFrom, to: resetAt, logs: statsService.logsBetween(allLogs, previousFrom, resetAt) },
      summary: {
        cleared: encounters.filter((e) => cleared.has(e.key)).length,
        total: encounters.length,
        kills: sinceReset.kills,
        wipes: sinceReset.wipes,
        resetInMs: nextResetAt.getTime() - now.getTime(),
      },
      labels: (category === "fractal"
        ? {
            cleared: "categories.clearedToday",
            kills: "categories.killsToday",
            wipes: "categories.wipesToday",
            noLogs: "boss.noLogsToday",
          }
        : {
            cleared: "categories.clearedThisWeek",
            kills: "categories.killsThisWeek",
            wipes: "categories.wipesThisWeek",
            noLogs: "boss.noLogsThisWeek",
          }) satisfies Record<string, TranslationKey>,
    };
  }, [logs, category, mode, now]);
}

const previousLabelFor = (category: PageCategory): TranslationKey =>
  category === "fractal" ? "categories.showYesterday" : "categories.showLastWeek";

/** The header's controls: the previous period (yesterday / last week), the CM mode and (fractals) the order. */
function PageActions({
  state,
  previousLabel,
  withFractalOrder,
}: {
  state: PageState;
  previousLabel: TranslationKey;
  withFractalOrder?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      {withFractalOrder && (
        <Select value={state.fractalOrder} onValueChange={(v) => state.setFractalOrder(v as FractalOrder)}>
          <SelectTrigger className="w-44" aria-label={t("instabilities.orderLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fractal">{t("instabilities.byFractal")}</SelectItem>
            <SelectItem value="playOrder">{t("instabilities.playOrder")}</SelectItem>
          </SelectContent>
        </Select>
      )}
      <Button variant={state.showPrevious ? "secondary" : "outline"} onClick={state.togglePrevious}>
        <HistoryIcon /> {t(previousLabel)}
      </Button>
      <Select value={state.mode} onValueChange={(v) => state.setMode(v as CmMode)}>
        <SelectTrigger className="w-36" aria-label={t("categories.modeLabel")}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODES.map((m) => (
            <SelectItem key={m.value} value={m.value}>
              {t(m.label)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/** One category: its numbers, the previous period's logs (when shown) and its groups; `title` when the page has more. */
function CategorySection({ category, state, title }: { category: PageCategory; state: PageState; title?: string }) {
  const { t, fmt } = useI18n();
  const { groups, summary, previous, labels } = useCategoryView(category, state.mode, state.now);

  return (
    <section className="flex min-w-0 flex-col gap-6">
      {title && <h2 className="text-lg font-semibold">{title}</h2>}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t(labels.cleared)} value={`${summary.cleared}/${summary.total}`} />
        <StatCard label={t(labels.kills)} value={summary.kills} tone="success" />
        <StatCard label={t(labels.wipes)} value={summary.wipes} tone="fail" />
        <StatCard label={t("categories.nextReset")} value={fmt.countdown(summary.resetInMs)} mono />
      </div>

      {state.showPrevious && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>{t(previousLabelFor(category))}</CardTitle>
              <CardDescription>
                {t("categories.previousRange", {
                  from: fmt.dateTime(previous.from),
                  to: fmt.dateTime(previous.to),
                  count: previous.logs.length,
                })}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={state.togglePrevious}>
              <XIcon /> {t("categories.hidePrevious")}
            </Button>
          </CardHeader>
          <CardContent>
            <LogTable logs={previous.logs} showGroup />
          </CardContent>
        </Card>
      )}

      {category === "fractal" ? (
        <FractalGroups groups={groups} state={state} noLogsLabel={t(labels.noLogs)} />
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((g) => (
            <Card key={g.group.id} className="gap-0 overflow-hidden py-0">
              <GroupHeader group={g.group} />
              <BossList bosses={g.bosses} state={state} noLogsLabel={t(labels.noLogs)} />
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

type GroupView = ReturnType<typeof useCategoryView>["groups"][number];

/** A group's card header: its boss portrait, short name and name. */
function GroupHeader({ group, isDaily }: { group: EncounterGroup; isDaily?: boolean }) {
  return (
    <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
      <img
        src={encounterService.groupIcon(group.id)}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover ring-1 ring-border"
        loading="lazy"
      />
      <Badge variant="secondary" className="font-mono">
        {group.short}
      </Badge>
      <CardTitle>{group.name}</CardTitle>
      {isDaily && <DailyBadge />}
    </CardHeader>
  );
}

function BossList({
  bosses,
  state,
  noLogsLabel,
}: {
  bosses: GroupView["bosses"];
  state: PageState;
  noLogsLabel: string;
}) {
  return (
    <ul>
      {bosses.map((b) => (
        <BossRow
          key={b.encounter.key}
          {...b}
          emptyLabel={noLogsLabel}
          open={state.selectedBoss === b.encounter.key}
          onToggle={() => state.toggleBoss(b.encounter.key)}
        />
      ))}
    </ul>
  );
}

function ColumnHeading({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-9 items-center justify-between gap-2 border-b px-5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
      {children}
    </div>
  );
}

/**
 * The fractals, each with two columns: its bosses (cleared today or not) and today's instabilities, with the No Pain,
 * No Gain ones at a glance above them. In play order: the user's sequence of CM fractals, dailies and recs, without the
 * ones they left out.
 */
function FractalGroups({ groups, state, noLogsLabel }: { groups: GroupView[]; state: PageState; noLogsLabel: string }) {
  const { t } = useI18n();
  const instabilities = useTodayInstabilities();
  const byGroup = new Map(groups.map((g) => [g.group.id, g]));
  const card = (g: GroupView) => (
    <FractalGroupCard key={g.group.id} view={g} instabilities={instabilities} state={state} noLogsLabel={noLogsLabel} />
  );

  return (
    <div className="flex flex-col gap-4">
      {instabilities.error != null ? (
        <InstabilitiesError error={instabilities.error} />
      ) : (
        !instabilities.loading && <NoPainNoGainBar fractals={instabilities.noPainNoGain} />
      )}

      {state.fractalOrder === "playOrder"
        ? instabilities.playSequence.map((entry) => {
            if (entry === PLAY_ORDER_DAILIES || entry === PLAY_ORDER_RECS) {
              const recs = entry === PLAY_ORDER_RECS;
              return (
                <ExtraFractalsCard
                  key={entry}
                  title={t(recs ? "fractalPlayOrder.recs" : "fractalPlayOrder.dailies")}
                  icon={recs ? <StarIcon className="size-4" /> : <CalendarDaysIcon className="size-4" />}
                  fractals={recs ? instabilities.recommended : instabilities.playOrderDailies}
                  loading={instabilities.loading}
                />
              );
            }
            const groupId = instabilityService.groupIdOf(entry);
            const view = groupId ? byGroup.get(groupId) : undefined;
            return view ? card(view) : null;
          })
        : groups.map(card)}
    </div>
  );
}

/** One CM fractal: its bosses (cleared today or not) beside today's instabilities. */
function FractalGroupCard({
  view: { group, bosses },
  instabilities,
  state,
  noLogsLabel,
}: {
  view: GroupView;
  instabilities: ReturnType<typeof useTodayInstabilities>;
  state: PageState;
  noLogsLabel: string;
}) {
  const { t } = useI18n();
  const fractal = instabilities.byGroup.get(group.id);
  const cleared = bosses.length > 0 && bosses.every((b) => b.clearedSinceReset);
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <GroupHeader group={group} isDaily={fractal?.isDaily} />
      <div className="grid md:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">
          <ColumnHeading>
            {t("instabilities.bossesColumn")}
            {cleared && (
              <span className="flex items-center gap-1 text-success">
                <CheckIcon className="size-3.5" /> {t("categories.clearedToday")}
              </span>
            )}
          </ColumnHeading>
          <BossList bosses={bosses} state={state} noLogsLabel={noLogsLabel} />
        </div>
        <div className="border-t bg-muted/20 md:border-t-0 md:border-l">
          <ColumnHeading>{t("instabilities.column")}</ColumnHeading>
          <div className="p-3">
            {instabilities.loading ? (
              <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
            ) : fractal ? (
              <InstabilityList instabilities={fractal.instabilities} />
            ) : (
              <span className="text-sm text-muted-foreground">{t("instabilities.none")}</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Today's T4 dailies (a CM level only when that CM is left out of the play order) or recs, side by side. */
function ExtraFractalsCard({
  title,
  icon,
  fractals,
  loading,
}: {
  title: string;
  icon: ReactNode;
  fractals: DailyFractal[];
  loading: boolean;
}) {
  return (
    <Card className="gap-0 overflow-hidden border-dashed py-0">
      <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground ring-1 ring-border">
          {icon}
        </span>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      {loading ? (
        <Loader2Icon className="m-5 size-4 animate-spin text-muted-foreground" />
      ) : (
        <ul className="grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          {fractals.map((d) => (
            <li key={d.level} className="flex flex-col gap-2 p-3">
              <span className="flex items-center justify-between gap-2 px-2 text-sm font-medium">
                {d.name}
                <span className="rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-semibold text-muted-foreground tabular-nums">
                  {d.level}
                </span>
              </span>
              <InstabilityList instabilities={d.instabilities} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** One category on its own page (fractals). */
export default function CategoryPage({ category }: { category: PageCategory }) {
  const state = usePageState();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`categories.${category}.title`)}
        description={t(`categories.${category}.subtitle`)}
        actions={
          <PageActions
            state={state}
            previousLabel={previousLabelFor(category)}
            withFractalOrder={category === "fractal"}
          />
        }
      />
      <CategorySection category={category} state={state} />
    </div>
  );
}

/**
 * Raids and strikes on one page (both reset weekly), each with its own numbers: raids on the left, strikes on the
 * right on wide screens, one under the other otherwise. The header's controls apply to both.
 */
export function RaidsStrikesPage() {
  const state = usePageState();
  const { t } = useI18n();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("categories.raidsStrikes.title")}
        description={t("categories.raidsStrikes.subtitle")}
        actions={<PageActions state={state} previousLabel={previousLabelFor("raid")} />}
      />
      <div className="grid items-start gap-8 xl:grid-cols-2">
        <CategorySection category="raid" state={state} title={t("categories.raid.title")} />
        <CategorySection category="strike" state={state} title={t("categories.strike.title")} />
      </div>
    </div>
  );
}
