import { useMemo, useState } from "react";
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
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import BossRow from "../components/BossRow";
import LogTable from "../components/LogTable";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";

type PageCategory = Exclude<Category, "other">;

const MODES: { value: CmMode; label: TranslationKey }[] = [
  { value: "all", label: "categories.modeAll" },
  { value: "normal", label: "categories.modeNormal" },
  { value: "cm", label: "categories.modeCm" },
];

function useCategoryController(category: PageCategory) {
  const { logs } = useLogs();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<CmMode>("all");
  const [showPrevious, setShowPrevious] = useState(false);
  const selectedBoss = params.get("boss");

  const view = useMemo(() => {
    const resetAt = statsService.resetFor(category);
    const byEncounter = statsService.logsByEncounter(logs, category, mode);
    // In CM mode, bosses without a Challenge Mote (VG, Gorseval, IBS strikes…) are left out entirely.
    const hasMode = (e: Encounter) => mode !== "cm" || !e.noCM;
    const encounters = encounterService.encountersFor(category).filter(hasMode);
    const allLogs = [...byEncounter.values()].flat();
    const cleared = statsService.clearedSince(allLogs, resetAt);
    const totals = statsService.encounterStats(allLogs);
    const previousFrom = statsService.previousResetFor(category);

    const groups = encounterService
      .groupsFor(category)
      .map((group) => ({
        group,
        bosses: encounterService
          .encountersInGroup(group.id)
          .filter(hasMode)
          .map((encounter) => {
            const bossLogs = byEncounter.get(encounter.key) ?? [];
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
        killed: encounters.filter((e) => byEncounter.get(e.key)?.some((l) => l.success)).length,
        clearedSinceReset: cleared.size,
        total: encounters.length,
        kills: totals.kills,
        wipes: totals.wipes,
      },
    };
  }, [logs, category, mode]);

  function toggleBoss(key: string) {
    const next = new URLSearchParams(params);
    if (selectedBoss === key) next.delete("boss");
    else next.set("boss", key);
    setParams(next, { replace: true });
  }

  return {
    ...view,
    mode,
    setMode,
    showPrevious,
    togglePrevious: () => setShowPrevious((v) => !v),
    previousLabel: (category === "fractal" ? "categories.showYesterday" : "categories.showLastWeek") as TranslationKey,
    selectedBoss,
    toggleBoss,
    clearedLabel: (category === "fractal" ? "categories.clearedToday" : "categories.clearedThisWeek") as TranslationKey,
  };
}

export default function CategoryPage({ category }: { category: PageCategory }) {
  const c = useCategoryController(category);
  const { t, fmt } = useI18n();
  const { summary, previous } = c;


  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`categories.${category}.title`)}
        description={t(`categories.${category}.subtitle`)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant={c.showPrevious ? "secondary" : "outline"} onClick={c.togglePrevious}>
              <HistoryIcon /> {t(c.previousLabel)}
            </Button>
            <ToggleGroup
              type="single"
              variant="outline"
              value={c.mode}
              onValueChange={(v) => v && c.setMode(v as CmMode)}
            >
              {MODES.map((m) => (
                <ToggleGroupItem key={m.value} value={m.value} className="px-4">
                  {t(m.label)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("categories.bossesKilled")} value={`${summary.killed}/${summary.total}`} />
        <StatCard label={t(c.clearedLabel)} value={`${summary.clearedSinceReset}/${summary.total}`} />
        <StatCard label={t("categories.kills")} value={summary.kills} tone="success" />
        <StatCard label={t("categories.wipes")} value={summary.wipes} tone="fail" />
      </div>

      {c.showPrevious && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="space-y-1.5">
              <CardTitle>{t(c.previousLabel)}</CardTitle>
              <CardDescription>
                {t("categories.previousRange", {
                  from: fmt.dateTime(previous.from),
                  to: fmt.dateTime(previous.to),
                  count: previous.logs.length,
                })}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={c.togglePrevious}>
              <XIcon /> {t("categories.hidePrevious")}
            </Button>
          </CardHeader>
          <CardContent>
            <LogTable logs={previous.logs} showGroup />
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {c.groups.map(({ group, bosses }) => (
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
                  open={c.selectedBoss === b.encounter.key}
                  onToggle={() => c.toggleBoss(b.encounter.key)}
                />
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );
}
