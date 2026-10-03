import { useMemo, useState, type ReactNode } from "react";
import { useI18n } from "../../controllers/I18nController";
import { sessionService } from "../../services/sessionService";
import type { Log } from "../../domain/types/log.types";
import type { SessionGroupLogs } from "../../domain/types/session.types";
import { sessionResultFilterStorage, type SessionResultFilter } from "../../storage/sessionResultFilterStorage";
import { Badge } from "@/presentation/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { cn } from "@/presentation/lib/utils";
import LogTable, { type LogSelection } from "./LogTable";
import { failBadge, successBadge } from "./ResultBadge";

/** The kills / wipes filter, remembered in this browser. */
export function useSessionResultFilter() {
  const [filter, setFilterState] = useState<SessionResultFilter>(() => sessionResultFilterStorage.get() ?? "together");
  const setFilter = (next: SessionResultFilter) => {
    setFilterState(next);
    sessionResultFilterStorage.set(next);
  };
  return { filter, setFilter };
}

/** Dropdown: kills and wipes together, or kills first and wipes at the end. */
export function SessionResultFilterToggle({
  filter,
  onChange,
}: {
  filter: SessionResultFilter;
  onChange: (filter: SessionResultFilter) => void;
}) {
  const { t } = useI18n();
  return (
    <Select value={filter} onValueChange={(v) => onChange(v as SessionResultFilter)}>
      <SelectTrigger size="sm" aria-label={t("sessions.resultFilter")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        <SelectItem value="together">{t("sessions.filterTogether")}</SelectItem>
        <SelectItem value="split">{t("sessions.filterSplit")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

function useGroupedLogTableController(logs: Log[]) {
  const all = useMemo(() => sessionService.byGroup(logs), [logs]);
  const kills = useMemo(() => sessionService.byGroup(logs.filter((l) => l.success)), [logs]);
  const wipes = useMemo(() => sessionService.byGroup(logs.filter((l) => !l.success)), [logs]);
  const killCount = logs.filter((l) => l.success).length;
  return { all, kills, wipes, killCount, wipeCount: logs.length - killCount };
}

interface Props {
  logs: Log[];
  /** From useSessionResultFilter(); the toggle itself sits in the page (top right of the logs card). */
  filter: SessionResultFilter;
  /** Rows open the log on dps.report instead of the (sign-in only) log page — for shared sessions. */
  openOnDpsReport?: boolean;
  /** Selection mode: a checkbox per row (see LogTable). */
  selection?: LogSelection;
}

/**
 * A session's logs split by wing / fractal / strike (W1, W2, …), each with its own kills / wipes. The filter
 * (SessionResultFilterToggle, in the page) shows kills and wipes together, or kills first and all wipes at the end.
 */
export default function GroupedLogTable({ logs, filter, openOnDpsReport = false, selection }: Props) {
  const c = useGroupedLogTableController(logs);
  const { t } = useI18n();
  if (!logs.length) return <LogTable logs={logs} />;

  const sections = (list: SessionGroupLogs[]) =>
    list.map((s) => (
      <GroupSection key={s.group?.id ?? "other"} section={s} openOnDpsReport={openOnDpsReport} selection={selection} />
    ));

  return (
    <div className="flex flex-col gap-6">
      {filter === "together" ? (
        sections(c.all)
      ) : (
        <div className="flex flex-col gap-10">
          {c.kills.length > 0 && (
            <ResultPart kind="kill" title={t("sessions.kills")} count={c.killCount}>
              {sections(c.kills)}
            </ResultPart>
          )}
          {c.wipes.length > 0 && (
            <ResultPart kind="wipe" title={t("sessions.wipes")} count={c.wipeCount}>
              {sections(c.wipes)}
            </ResultPart>
          )}
        </div>
      )}
    </div>
  );
}

/** "Kills, then wipes": one of the two parts, under a coloured heading with a rule below it. */
function ResultPart({
  kind,
  title,
  count,
  children,
}: {
  kind: "kill" | "wipe";
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "flex items-center gap-2 border-b-2 pb-2",
          kind === "kill" ? "border-success/50" : "border-destructive/50",
        )}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        <Badge variant="outline" className={kind === "kill" ? successBadge : failBadge}>
          {count}
        </Badge>
      </div>
      {children}
    </div>
  );
}

function GroupSection({
  section: { group, logs, kills, wipes },
  openOnDpsReport,
  selection,
}: {
  section: SessionGroupLogs;
  openOnDpsReport: boolean;
  selection?: LogSelection;
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
      <LogTable logs={logs} openOnDpsReport={openOnDpsReport} selection={selection} />
    </section>
  );
}
