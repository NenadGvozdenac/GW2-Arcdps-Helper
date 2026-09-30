import type { ReactNode } from "react";
import { Loader2Icon, SparklesIcon, UsersIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { Log, PlayerSummary } from "../../domain/types/log.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../utils/professionColors";
import BoonTable from "./BoonTable";
import CommanderIcon from "./CommanderIcon";
import ResultBadge from "./ResultBadge";
import StatCard from "./StatCard";

interface Props {
  log: Log;
  /** The squad; null while it is still loading (the lists don't carry it, see LogDetail). */
  players: PlayerSummary[] | null;
  /** Buttons in the boss card (dps.report, share, delete, …). */
  actions: ReactNode;
  /** Extra text after the date / "recorded by" line (e.g. who shared it). */
  meta?: ReactNode;
  /** Rows of this account are highlighted in the players table. */
  isOwnAccount: (account: string) => boolean;
  /** Shown between the boss card and the stats (e.g. an error). */
  children?: ReactNode;
}

/** One log: boss card, squad totals and the players table. Used by the log page and the public shared-log page. */
export default function LogView({ log, players, actions, meta, isOwnAccount, children }: Props) {
  const { t, fmt } = useI18n();
  const squad = players ?? [];
  const totals = {
    squadDps: squad.reduce((s, p) => s + p.dps, 0),
    downs: squad.reduce((s, p) => s + p.downs, 0),
    deaths: squad.reduce((s, p) => s + p.deaths, 0),
    topDps: squad[0]?.dps || 1,
    hasSubgroups: new Set(squad.map((p) => p.group)).size > 1,
  };
  const pending = players === null ? "…" : null;

  return (
    <>
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          {log.bossIcon && <img src={log.bossIcon} alt="" className="size-16 rounded-lg" />}
          <div className="min-w-48 flex-1 space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">{log.bossName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <ResultBadge log={log} />
              <span>{fmt.dateTime(log.encounterTime)}</span>
              {log.recordedBy && <span>{t("logDetail.recordedBy", { name: log.recordedBy })}</span>}
              {meta}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">{actions}</div>
        </CardContent>
      </Card>

      {children}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("logDetail.duration")} value={fmt.duration(log.durationMs)} mono />
        <StatCard label={t("logDetail.squadDps")} value={pending ?? fmt.number(totals.squadDps)} />
        <StatCard label={t("logDetail.downs")} value={pending ?? totals.downs} />
        <StatCard label={t("logDetail.deaths")} value={pending ?? totals.deaths} />
      </div>

      <Tabs defaultValue="players">
        <TabsList>
          <TabsTrigger value="players">
            <UsersIcon /> {t("logDetail.tabPlayers")}
          </TabsTrigger>
          <TabsTrigger value="boons">
            <SparklesIcon /> {t("logDetail.tabBoons")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="players">
          <Card>
            <CardHeader>
              <CardTitle>{t("logDetail.players")}</CardTitle>
            </CardHeader>
            <CardContent>
              {players === null ? (
                <div className="grid place-items-center py-10" role="status" aria-busy="true">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("logDetail.colCharacter")}</TableHead>
                    <TableHead>{t("logDetail.colAccount")}</TableHead>
                    <TableHead>{t("logDetail.colSpec")}</TableHead>
                    {totals.hasSubgroups && <TableHead className="text-right">{t("logDetail.colGroup")}</TableHead>}
                    <TableHead className="text-right">{t("logDetail.colBossDps")}</TableHead>
                    <TableHead className="text-right">{t("logDetail.colTotalDps")}</TableHead>
                    <TableHead className="text-right">{t("logDetail.colDowns")}</TableHead>
                    <TableHead className="text-right">{t("logDetail.colDeaths")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {squad.map((p, i) => (
                    <TableRow
                      key={p.account + p.name}
                      className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}
                    >
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          {p.name}
                          {p.commander && <CommanderIcon label={t("logDetail.commander")} />}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.account}</TableCell>
                      <TableCell>
                        <span className="font-medium" style={{ color: professionColor(p.profession) }}>
                          {p.profession || "—"}
                        </span>
                      </TableCell>
                      {totals.hasSubgroups && <TableCell className="text-right text-muted-foreground">{p.group}</TableCell>}
                      <TableCell className="text-right">
                        <div className="relative ml-auto h-6 min-w-32 overflow-hidden rounded bg-muted">
                          <div
                            className="absolute inset-y-0 left-0 opacity-40"
                            style={{
                              width: `${(p.dps / totals.topDps) * 100}%`,
                              background: professionColor(p.profession),
                            }}
                          />
                          <span className="relative px-2 font-mono text-xs leading-6 font-semibold tabular-nums">
                            {fmt.number(p.dps)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                        {fmt.number(p.totalDps)}
                      </TableCell>
                      <TableCell className="text-right">{p.downs || ""}</TableCell>
                      <TableCell className="text-right">{p.deaths || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="boons">
          <Card>
            <CardHeader>
              <CardTitle>{t("logDetail.tabBoons")}</CardTitle>
            </CardHeader>
            <CardContent>
              {players === null ? (
                <div className="grid place-items-center py-10" role="status" aria-busy="true">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <BoonTable players={players} isOwnAccount={isOwnAccount} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p className="text-xs text-muted-foreground">
        {t("logDetail.footer", {
          build: log.gw2Build ?? "?",
          ei: log.eliteInsightsVersion ?? "?",
          trigger: log.triggerId ?? "?",
        })}
      </p>
    </>
  );
}
