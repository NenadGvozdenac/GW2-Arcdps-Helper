import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { HistoryIcon, XIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { statsService } from "../../services/statsService";
import type { Category, Encounter } from "../../domain/types/encounter.types";
import type { CmMode } from "../../domain/types/log.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Button } from "@/presentation/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import BossRow from "../components/BossRow";
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

/** The header's controls: the previous period (yesterday / last week) and the CM mode. */
function PageActions({ state, previousLabel }: { state: PageState; previousLabel: TranslationKey }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
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

      <div className="flex flex-col gap-4">
        {groups.map(({ group, bosses }) => (
          <Card key={group.id} className="gap-0 overflow-hidden py-0">
            <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
              <Badge variant="secondary" className="font-mono">
                {group.short}
              </Badge>
              <CardTitle>{group.name}</CardTitle>
            </CardHeader>
            <ul>
              {bosses.map((b) => (
                <BossRow
                  key={b.encounter.key}
                  {...b}
                  emptyLabel={t(labels.noLogs)}
                  open={state.selectedBoss === b.encounter.key}
                  onToggle={() => state.toggleBoss(b.encounter.key)}
                />
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </section>
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
        actions={<PageActions state={state} previousLabel={previousLabelFor(category)} />}
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
