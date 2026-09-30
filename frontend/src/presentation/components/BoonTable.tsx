import { FlagIcon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { BOON_STACK_MAX, BOONS } from "../../domain/data/boons";
import type { Boon, PlayerSummary } from "../../domain/types/log.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../utils/professionColors";

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

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{t("logDetail.boonsHint")}</p>
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
          {sections.flatMap((section) => [
            ...section.players.map((p) => (
              <TableRow
                key={p.account + p.name}
                className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}
              >
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    {p.commander && <FlagIcon className="size-3.5 text-warning" aria-label={t("logDetail.commander")} />}
                    <span style={{ color: professionColor(p.profession) }}>{p.name}</span>
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
                    key={`group-${section.group}`}
                    label={t("logDetail.subgroupAverage", { group: section.group })}
                    players={section.players}
                  />,
                ]
              : []),
          ])}
          <SummaryRow key="squad" label={t("logDetail.squadAverage")} players={squad} strong />
        </TableBody>
      </Table>
    </div>
  );
}

function SummaryRow({ label, players, strong }: { label: string; players: PlayerSummary[]; strong?: boolean }) {
  return (
    <TableRow className={cn("bg-muted/40 hover:bg-muted/40", strong && "border-t-2")}>
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
