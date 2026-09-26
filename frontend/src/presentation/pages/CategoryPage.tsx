import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { encounterService } from "../../services/encounterService";
import { statsService } from "../../services/statsService";
import type { Category } from "../../domain/types/encounter.types";
import type { CmMode } from "../../domain/types/log.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import { Badge } from "@/presentation/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import BossRow from "../components/BossRow";
import PageHeader from "../components/PageHeader";
import StatCard from "../components/StatCard";
import { Spinner } from "../components/Spinner";

type PageCategory = Exclude<Category, "other">;

const MODES: { value: CmMode; label: TranslationKey }[] = [
  { value: "all", label: "categories.modeAll" },
  { value: "normal", label: "categories.modeNormal" },
  { value: "cm", label: "categories.modeCm" },
];

function useCategoryController(category: PageCategory) {
  const { logs, loading } = useLogs();
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<CmMode>("all");
  const selectedBoss = params.get("boss");

  const view = useMemo(() => {
    const resetAt = statsService.resetFor(category);
    const byEncounter = statsService.logsByEncounter(logs, category, mode);
    const encounters = encounterService.encountersFor(category);
    const allLogs = [...byEncounter.values()].flat();
    const cleared = statsService.clearedSince(allLogs, resetAt);
    const totals = statsService.encounterStats(allLogs);

    const groups = encounterService.groupsFor(category).map((group) => ({
      group,
      bosses: encounterService.encountersInGroup(group.id).map((encounter) => {
        const bossLogs = byEncounter.get(encounter.key) ?? [];
        return {
          encounter,
          logs: bossLogs,
          stats: statsService.encounterStats(bossLogs),
          clearedSinceReset: cleared.has(encounter.key),
        };
      }),
    }));

    return {
      groups,
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
    loading,
    mode,
    setMode,
    selectedBoss,
    toggleBoss,
    clearedLabel: (category === "fractal" ? "categories.clearedToday" : "categories.clearedThisWeek") as TranslationKey,
  };
}

export default function CategoryPage({ category }: { category: PageCategory }) {
  const c = useCategoryController(category);
  const { t } = useI18n();
  const { summary } = c;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(`categories.${category}.title`)}
        description={t(`categories.${category}.subtitle`)}
        actions={
          <ToggleGroup type="single" variant="outline" value={c.mode} onValueChange={(v) => v && c.setMode(v as CmMode)}>
            {MODES.map((m) => (
              <ToggleGroupItem key={m.value} value={m.value} className="px-4">
                {t(m.label)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("categories.bossesKilled")} value={`${summary.killed}/${summary.total}`} />
        <StatCard label={t(c.clearedLabel)} value={`${summary.clearedSinceReset}/${summary.total}`} />
        <StatCard label={t("categories.kills")} value={summary.kills} tone="success" />
        <StatCard label={t("categories.wipes")} value={summary.wipes} tone="fail" />
      </div>

      {c.loading ? (
        <Spinner />
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-2">
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
      )}
    </div>
  );
}
