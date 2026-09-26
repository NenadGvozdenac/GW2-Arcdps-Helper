import { ChevronRightIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { Encounter } from "../../domain/types/encounter.types";
import type { Log } from "../../domain/types/log.types";
import type { EncounterStats } from "../../domain/types/stats.types";
import { Badge } from "@/presentation/components/ui/badge";
import { cn } from "@/presentation/lib/utils";
import LogTable from "./LogTable";
import { cmBadge } from "./ResultBadge";

interface Props {
  encounter: Encounter;
  logs: Log[];
  stats: EncounterStats;
  clearedSinceReset: boolean;
  open: boolean;
  onToggle: () => void;
}

export default function BossRow({ encounter, logs, stats, clearedSinceReset, open, onToggle }: Props) {
  const { t, fmt } = useI18n();
  const hasLogs = logs.length > 0;

  return (
    <li className="border-t first:border-t-0">
      <button
        className={cn(
          "grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-3 text-left transition-colors sm:grid-cols-[auto_1fr_auto_auto]",
          hasLogs ? "hover:bg-accent/50" : "cursor-default",
          open && "bg-accent/50",
        )}
        onClick={onToggle}
        disabled={!hasLogs}
      >
        <span
          className={cn(
            "size-2.5 rounded-full",
            clearedSinceReset ? "bg-success shadow-[0_0_8px] shadow-success/60" : stats.kills ? "bg-success/40" : "bg-muted",
          )}
          title={clearedSinceReset ? t("boss.clearedSinceReset") : undefined}
        />
        <span className={cn("font-medium", !hasLogs && "text-muted-foreground")}>{encounter.name}</span>
        <span className="flex items-center gap-2 text-sm">
          {hasLogs ? (
            <>
              <span className="text-success">{t("boss.killsShort", { count: stats.kills })}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-destructive">{t("boss.wipesShort", { count: stats.wipes })}</span>
              {stats.bestKillMs != null && (
                <span className="hidden font-mono text-muted-foreground tabular-nums md:inline">
                  {t("boss.best", { time: fmt.duration(stats.bestKillMs) })}
                </span>
              )}
              {stats.cmKills > 0 && (
                <Badge variant="outline" className={cmBadge}>
                  {t("common.cm")} ×{stats.cmKills}
                </Badge>
              )}
              <ChevronRightIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-90")} />
            </>
          ) : (
            <span className="text-muted-foreground">{t("boss.noLogs")}</span>
          )}
        </span>
        <span className="hidden min-w-24 text-right text-xs text-muted-foreground sm:block">
          {stats.lastAttempt ? fmt.date(stats.lastAttempt) : ""}
        </span>
      </button>
      {open && (
        <div className="border-t bg-muted/30 px-2 pb-2">
          <LogTable logs={logs} />
        </div>
      )}
    </li>
  );
}
