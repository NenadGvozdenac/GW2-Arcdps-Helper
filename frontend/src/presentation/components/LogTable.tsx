import { ExternalLinkIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useLogs } from "../../controllers/LogsController";
import { useSessions } from "../../controllers/SessionsController";
import { encounterService } from "../../services/encounterService";
import { Link, useNavigate } from "react-router-dom";
import type { Log, SquadSummary } from "../../domain/types/log.types";
import { Button } from "@/presentation/components/ui/button";
import { Checkbox } from "@/presentation/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import ResultBadge from "./ResultBadge";

function useLogTableController() {
  const navigate = useNavigate();
  const { freshIds } = useLogs();
  const { sessions } = useSessions();
  return {
    /** The log's session, if it was recorded in one. */
    sessionOf: (log: Log) => (log.sessionId ? (sessions.find((s) => s.id === log.sessionId) ?? null) : null),
    isFresh: (log: Log) => freshIds.has(log.id),
    openLog: (log: Log, external: boolean) =>
      external ? window.open(log.url, "_blank", "noopener,noreferrer") : navigate(`/logs/${log.id}`),
    groupLabel: (log: Log) => encounterService.groupById(log.groupId)?.short ?? "—",
  };
}

export interface LogSelection {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

interface Props {
  /** With `squad` (search pages), the detailed table can show it. */
  logs: (Log & { squad?: SquadSummary })[];
  showGroup?: boolean;
  /** Rows open the log on dps.report instead of the (sign-in only) log page — for shared sessions. */
  openOnDpsReport?: boolean;
  /** Selection mode (organizing): a checkbox per row, and clicking a row toggles it instead of opening the log. */
  selection?: LogSelection;
  /**
   * Extra columns on wide screens ("All logs"): the boss's HP left on a wipe, the squad (size, DPS, your DPS, downs /
   * deaths) and the session.
   */
  detailed?: boolean;
}

// Columns show by the width the table itself has (container queries), not the window's: the same table fits a narrow
// dashboard column and a full-width page, and the boss name always keeps room (~200px).
const groupCol = "hidden @md:table-cell";
const linkCol = "hidden @2xl:table-cell";
const dateCol = "hidden @4xl:table-cell";
/** The detailed table's extra columns. */
const wide = "hidden @min-[92rem]:table-cell";

export default function LogTable({ logs, showGroup = false, openOnDpsReport = false, selection, detailed = false }: Props) {
  const { openLog, groupLabel, isFresh, sessionOf } = useLogTableController();
  const { t, fmt } = useI18n();
  if (!logs.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("common.noLogs")}</p>;

  return (
    // Fixed layout with set column widths, so tables shown one under another (a session's wings, …) line up. The
    // container is what the columns' container queries measure.
    <div className="@container">
      <Table className="table-fixed">
        <TableHeader>
          <TableRow>
            {selection && <TableHead className="w-10" />}
            <TableHead>{t("logTable.boss")}</TableHead>
            {showGroup && <TableHead className={cn(groupCol, "w-16")}>{t("logTable.group")}</TableHead>}
            <TableHead className="w-28 @xl:w-44">{t("logTable.result")}</TableHead>
            <TableHead className="w-24 text-right">{t("logTable.duration")}</TableHead>
            {detailed && (
              <>
                <TableHead className={cn(wide, "w-20 text-right")}>{t("logTable.bossHp")}</TableHead>
                <TableHead className={cn(wide, "w-16 text-right")}>{t("logTable.squad")}</TableHead>
                <TableHead className={cn(wide, "w-24 text-right")}>{t("logTable.squadDps")}</TableHead>
                <TableHead className={cn(wide, "w-24 text-right")}>{t("logTable.yourDps")}</TableHead>
                <TableHead className={cn(wide, "w-28 text-right")}>{t("logTable.downsDeaths")}</TableHead>
                <TableHead className={cn(wide, "w-40")}>{t("logTable.session")}</TableHead>
              </>
            )}
            <TableHead className={cn(dateCol, "w-44")}>{t("logTable.date")}</TableHead>
            <TableHead className={cn(linkCol, "w-32")} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((l) => (
            <TableRow
              key={l.id}
              className={cn(
                "cursor-pointer",
                isFresh(l) && "row-fresh",
                selection?.selected.has(l.id) && "bg-accent/40 hover:bg-accent/50",
              )}
              onClick={() => (selection ? selection.onToggle(l.id) : openLog(l, openOnDpsReport))}
              data-state={selection?.selected.has(l.id) ? "selected" : undefined}
            >
              {selection && (
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selection.selected.has(l.id)}
                    onCheckedChange={() => selection.onToggle(l.id)}
                    aria-label={l.bossName}
                  />
                </TableCell>
              )}
              <TableCell className="whitespace-normal">
                <div className="flex items-center gap-2.5">
                  {l.bossIcon && <img src={l.bossIcon} alt="" className="size-7 shrink-0 rounded-md" loading="lazy" />}
                  <span className="min-w-0 font-medium break-words">{l.bossName}</span>
                </div>
              </TableCell>
              {showGroup && <TableCell className={cn(groupCol, "text-muted-foreground")}>{groupLabel(l)}</TableCell>}
              <TableCell className="whitespace-normal">
                <ResultBadge log={l} />
              </TableCell>
              <TableCell className="text-right font-mono tabular-nums">{fmt.duration(l.durationMs)}</TableCell>
              {detailed && (
                <>
                  <TableCell className={cn(wide, "text-right tabular-nums text-muted-foreground")}>
                    {!l.success && l.bossHealthLeft !== null ? `${l.bossHealthLeft.toFixed(1)}%` : "—"}
                  </TableCell>
                  <TableCell className={cn(wide, "text-right tabular-nums")}>{l.squad?.size || "—"}</TableCell>
                  <TableCell className={cn(wide, "text-right tabular-nums")}>
                    {l.squad?.size ? fmt.number(l.squad.dps) : "—"}
                  </TableCell>
                  <TableCell className={cn(wide, "text-right font-medium tabular-nums")}>
                    {l.squad?.ownDps != null ? fmt.number(l.squad.ownDps) : "—"}
                  </TableCell>
                  <TableCell className={cn(wide, "text-right tabular-nums text-muted-foreground")}>
                    {l.squad?.size ? `${l.squad.downs} / ${l.squad.deaths}` : "—"}
                  </TableCell>
                  <TableCell className={cn(wide, "truncate")}>
                    {(() => {
                      const session = sessionOf(l);
                      if (!session) return <span className="text-muted-foreground">—</span>;
                      return (
                        <Link
                          to={`/sessions/${session.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:underline"
                          title={session.name || t("sessions.unnamed")}
                        >
                          {session.name || t("sessions.unnamed")}
                        </Link>
                      );
                    })()}
                  </TableCell>
                </>
              )}
              <TableCell className={cn(dateCol, "text-muted-foreground")}>
                {fmt.dateTime(l.encounterTime)}
              </TableCell>
              <TableCell className={cn(linkCol, "text-right")}>
                <Button asChild variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    dps.report <ExternalLinkIcon />
                  </a>
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
