import { useI18n } from "../../controllers/I18nController";
import { BOON_STACK_MAX, BOONS } from "../../domain/data/boons";
import type { Boon, PlayerSummary } from "../../domain/types/log.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../utils/professionColors";
import CommanderIcon from "./CommanderIcon";

interface Props {
  players: PlayerSummary[];
  isOwnAccount: (account: string) => boolean;
}

const hasBoonData = (players: PlayerSummary[]) => players.some((p) => p.boons && Object.keys(p.boons).length > 0);
const average = (players: PlayerSummary[], boon: Boon) =>
  players.reduce((sum, p) => sum + (p.boons?.[boon] ?? 0), 0) / players.length;

/** Uptime of each boon per player (the "Boons" tab of a log), grouped by subgroup when the squad has several. */
export default function BoonTable({ players: squad, isOwnAccount }: Props) {
  const { t } = useI18n();
  if (!hasBoonData(squad)) return <p className="py-6 text-sm text-muted-foreground">{t("logDetail.boonsNone")}</p>;

  const groups = [...new Set(squad.map((p) => p.group))].sort((a, b) => a - b);
  const bySubgroup = groups.length > 1;
  const sections = bySubgroup
    ? groups.map((g) => ({ group: g, players: squad.filter((p) => p.group === g).sort((a, b) => b.dps - a.dps) }))
    : [{ group: 0, players: squad }];

  const columns = BOONS.length + 1;

  return (
    <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("logDetail.colCharacter")}</TableHead>
            {BOONS.map((boon) => (
              <TableHead key={boon} className="text-center" title={t(`sessionExport.boons.${boon}`)}>
                {t(`logDetail.boonShort.${boon}`)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sections.flatMap((section, i) => [
            ...(bySubgroup
              ? [
                  // Empty gap between subgroups, then the subgroup's title row.
                  ...(i > 0
                    ? [
                        <TableRow key={`gap-${section.group}`} className="border-0 hover:bg-transparent">
                          <TableCell colSpan={columns} className="h-5 p-0" />
                        </TableRow>,
                      ]
                    : []),
                  <TableRow key={`title-${section.group}`} className="border-b-2 bg-muted hover:bg-muted">
                    <TableCell colSpan={columns} className="py-2">
                      <span className="text-sm font-semibold">
                        {t("logDetail.subgroupTitle", { group: section.group })}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("logDetail.subgroupPlayers", { count: section.players.length })}
                      </span>
                    </TableCell>
                  </TableRow>,
                ]
              : []),
            ...section.players.map((p) => (
              <TableRow
                key={p.account + p.name}
                className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span style={{ color: professionColor(p.profession) }}>{p.name}</span>
                    {p.commander && <CommanderIcon label={t("logDetail.commander")} />}
                  </span>
                  <div className="text-xs font-normal text-muted-foreground">{p.account}</div>
                </TableCell>
                {BOONS.map((boon) => (
                  <BoonCell key={boon} boon={boon} value={p.boons?.[boon] ?? 0} />
                ))}
              </TableRow>
            )),
            ...(bySubgroup
              ? [
                  <SummaryRow
                    key={`average-${section.group}`}
                    label={t("logDetail.subgroupAverage")}
                    players={section.players}
                  />,
                ]
              : []),
          ])}
          {bySubgroup && (
            <TableRow className="border-0 hover:bg-transparent">
              <TableCell colSpan={columns} className="h-5 p-0" />
            </TableRow>
          )}
          <SummaryRow label={t("logDetail.squadAverage")} players={squad} strong />
        </TableBody>
    </Table>
  );
}

function SummaryRow({ label, players, strong }: { label: string; players: PlayerSummary[]; strong?: boolean }) {
  return (
    <TableRow className={cn("bg-muted/40 hover:bg-muted/40", strong && "border-y-2 bg-muted hover:bg-muted")}>
      <TableCell className={cn("text-muted-foreground italic", strong && "font-semibold text-foreground not-italic")}>
        {label}
      </TableCell>
      {BOONS.map((boon) => (
        <BoonCell key={boon} boon={boon} value={average(players, boon)} />
      ))}
    </TableRow>
  );
}

/** Uptime (%) or average stacks, tinted green by how close it is to full. */
function BoonCell({ boon, value }: { boon: Boon; value: number }) {
  const stackMax = BOON_STACK_MAX.get(boon);
  const share = Math.min(value / (stackMax ?? 100), 1);
  return (
    <TableCell
      className="text-center font-mono text-xs tabular-nums"
      style={{
        background: value > 0 ? `color-mix(in oklch, var(--color-success) ${Math.round(share * 45)}%, transparent)` : undefined,
      }}
    >
      {value > 0 ? (stackMax ? value.toFixed(1) : `${Math.round(value)}%`) : <span className="text-muted-foreground">–</span>}
    </TableCell>
  );
}
