import { useEffect, useState, type ReactNode } from "react";
import { Loader2Icon, SparklesIcon, UsersIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import type { Log, PlayerSummary } from "../../domain/types/log.types";
import type { TranslationKey } from "../../i18n/i18n.types";
import {
  playerSortService,
  type PlayerSort,
  type PlayerSortField,
} from "../../services/playerSortService";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/presentation/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/presentation/components/ui/tabs";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../utils/professionColors";
import { preloadImages, useImagesLoaded } from "../../hooks/useImagesLoaded";
import BoonTable, { BOON_TABLE_IMAGES } from "./BoonTable";
import ProfessionIcon, { squadProfessionIcons } from "./ProfessionIcon";
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

const SORT_FIELD_LABEL: Record<PlayerSortField, TranslationKey> = {
  bossDps: "logDetail.colBossDps",
  group: "logDetail.colGroup",
  totalDps: "logDetail.colTotalDps",
  downs: "logDetail.colDowns",
  deaths: "logDetail.colDeaths",
};

/** "<field>: highest first" / "<field>: lowest first". */
const SORT_DIRECTION_LABEL: Record<PlayerSort["direction"], TranslationKey> = {
  desc: "logDetail.sortHighFirst",
  asc: "logDetail.sortLowFirst",
};

/** Sort menu of the players table; the choice is remembered in this browser. */
// The players table's columns by its own width: account, group, total DPS and downs / deaths come with room.
const downsCol = "hidden @md:table-cell";
const groupCol = "hidden @lg:table-cell";
const accountCol = "hidden @2xl:table-cell";
const totalDpsCol = "hidden @3xl:table-cell";

function PlayerSortSelect({ sort, onChange }: { sort: PlayerSort; onChange: (sort: PlayerSort) => void }) {
  const { t } = useI18n();
  return (
    <Select
      value={playerSortService.toKey(sort)}
      onValueChange={(key) => onChange(playerSortService.fromKey(key))}
    >
      <SelectTrigger size="sm" className="w-56" aria-label={t("logDetail.sortBy")}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="end">
        {playerSortService.options().map((o) => (
          <SelectItem key={playerSortService.toKey(o)} value={playerSortService.toKey(o)}>
            {t(SORT_DIRECTION_LABEL[o.direction], { field: t(SORT_FIELD_LABEL[o.field]) })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One log: boss card, squad totals and the players table. Used by the log page and the public shared-log page. */
export default function LogView({ log, players, actions, meta, isOwnAccount, children }: Props) {
  const { t, fmt } = useI18n();
  // Load the "Boons" tab's icons in the background, so the tab is ready when it is opened.
  useEffect(() => void preloadImages(BOON_TABLE_IMAGES), []);
  // The squad's profession icons: the players table waits for them (the boons table does too), so they don't pop in.
  const professionIconsReady = useImagesLoaded(squadProfessionIcons(players ?? []));
  const squad = players ?? [];
  const [sort, setSort] = useState<PlayerSort>(playerSortService.saved);
  const changeSort = (next: PlayerSort) => {
    setSort(next);
    playerSortService.save(next);
  };
  const sortedSquad = playerSortService.sort(squad, sort);
  const totals = {
    squadDps: squad.reduce((s, p) => s + p.dps, 0),
    downs: squad.reduce((s, p) => s + p.downs, 0),
    deaths: squad.reduce((s, p) => s + p.deaths, 0),
    // The DPS bars are relative to the best player, wherever the sort puts them.
    topDps: Math.max(1, ...squad.map((p) => p.dps)),
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
              {squad.length > 1 && (
                <CardAction>
                  <PlayerSortSelect sort={sort} onChange={changeSort} />
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {players === null || !professionIconsReady ? (
                <div className="grid place-items-center py-10" role="status" aria-busy="true">
                  <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
              // Columns show by the table's own width (container queries): on a phone, the player and their boss DPS.
              <div className="@container">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>{t("logDetail.colCharacter")}</TableHead>
                    <TableHead className={accountCol}>{t("logDetail.colAccount")}</TableHead>
                    <TableHead className={cn(groupCol, "text-right")}>{t("logDetail.colGroup")}</TableHead>
                    <TableHead className="text-right">{t("logDetail.colBossDps")}</TableHead>
                    <TableHead className={cn(totalDpsCol, "text-right")}>{t("logDetail.colTotalDps")}</TableHead>
                    <TableHead className={cn(downsCol, "text-right")}>{t("logDetail.colDowns")}</TableHead>
                    <TableHead className={cn(downsCol, "text-right")}>{t("logDetail.colDeaths")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedSquad.map((p, i) => (
                    <TableRow
                      key={p.account + p.name}
                      className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}
                    >
                      <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">
                        <span className="inline-flex max-w-32 items-center gap-2 @md:max-w-40 @2xl:max-w-none">
                          <ProfessionIcon profession={p.profession} />
                          <span className="truncate" title={p.name}>
                            {p.name}
                          </span>
                          {p.commander && <CommanderIcon label={t("logDetail.commander")} />}
                        </span>
                      </TableCell>
                      <TableCell className={cn(accountCol, "text-muted-foreground")}>{p.account}</TableCell>
                      <TableCell className={cn(groupCol, "text-right text-muted-foreground")}>{p.group || "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="relative ml-auto h-6 min-w-24 overflow-hidden rounded bg-muted @md:min-w-32">
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
                      <TableCell className={cn(totalDpsCol, "text-right font-mono text-muted-foreground tabular-nums")}>
                        {fmt.number(p.totalDps)}
                      </TableCell>
                      <TableCell className={cn(downsCol, "text-right")}>{p.downs || ""}</TableCell>
                      <TableCell className={cn(downsCol, "text-right")}>{p.deaths || ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              </div>
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
