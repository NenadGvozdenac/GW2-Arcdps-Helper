import { useMemo, useState } from "react";
import { useI18n } from "../../controllers/I18nController";
import { sessionService } from "../../services/sessionService";
import type { Log } from "../../domain/types/log.types";
import type { SessionGroupLogs } from "../../domain/types/session.types";
import { Badge } from "@/presentation/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/presentation/components/ui/toggle-group";
import LogTable from "./LogTable";
import { failBadge, successBadge } from "./ResultBadge";

/** "together": kills and wipes in one list. "split": kills first, wipes at the end. */
type ResultFilter = "together" | "split";

function useGroupedLogTableController(logs: Log[]) {
  const [filter, setFilter] = useState<ResultFilter>("together");
  const all = useMemo(() => sessionService.byGroup(logs), [logs]);
  const kills = useMemo(() => sessionService.byGroup(logs.filter((l) => l.success)), [logs]);
  const wipes = useMemo(() => sessionService.byGroup(logs.filter((l) => !l.success)), [logs]);
  return { filter, setFilter, all, kills, wipes };
}

interface Props {
  logs: Log[];
  /** Rows open the log on dps.report instead of the (sign-in only) log page — for shared sessions. */
  openOnDpsReport?: boolean;
}

/**
 * A session's logs split by wing / fractal / strike (W1, W2, …), each with its own kills / wipes. A filter on top
 * shows kills and wipes together, or kills first and all wipes at the end.
 */
export default function GroupedLogTable({ logs, openOnDpsReport = false }: Props) {
  const c = useGroupedLogTableController(logs);
  const { t } = useI18n();
  if (!logs.length) return <LogTable logs={logs} />;

  const sections = (list: SessionGroupLogs[]) =>
    list.map((s) => <GroupSection key={s.group?.id ?? "other"} section={s} openOnDpsReport={openOnDpsReport} />);

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={c.filter}
        onValueChange={(v) => v && c.setFilter(v as ResultFilter)}
        aria-label={t("sessions.resultFilter")}
        className="self-start"
      >
        <ToggleGroupItem value="together" className="px-3 text-xs">
          {t("sessions.filterTogether")}
        </ToggleGroupItem>
        <ToggleGroupItem value="split" className="px-3 text-xs">
          {t("sessions.filterSplit")}
        </ToggleGroupItem>
      </ToggleGroup>

      {c.filter === "together" ? (
        sections(c.all)
      ) : (
        <>
          {c.kills.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-sm font-medium text-muted-foreground">{t("sessions.kills")}</h3>
              {sections(c.kills)}
            </div>
          )}
          {c.wipes.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-sm font-medium text-muted-foreground">{t("sessions.wipes")}</h3>
              {sections(c.wipes)}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function GroupSection({
  section: { group, logs, kills, wipes },
  openOnDpsReport,
}: {
  section: SessionGroupLogs;
  openOnDpsReport: boolean;
}) {
  const { t } = useI18n();
  return (
    <section className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          {group?.short ?? t("sessions.otherGroup")}
        </Badge>
        {group && <h3 className="font-semibold">{group.name}</h3>}
        <span aria-hidden className="text-muted-foreground">
          ·
        </span>
        {(kills > 0 || wipes === 0) && (
          <Badge variant="outline" className={successBadge}>
            {t("sessions.killsCount", { count: kills })}
          </Badge>
        )}
        {wipes > 0 && (
          <Badge variant="outline" className={failBadge}>
            {t("sessions.wipesCount", { count: wipes })}
          </Badge>
        )}
      </div>
      <LogTable logs={logs} openOnDpsReport={openOnDpsReport} />
    </section>
  );
}
