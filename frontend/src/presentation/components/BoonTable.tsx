import type { ReactNode } from "react";
import { Loader2Icon } from "lucide-react";
import { useI18n } from "../../controllers/I18nController";
import { useImagesLoaded } from "../../hooks/useImagesLoaded";
import { BOON_PROVIDER_MIN_GENERATION, BOON_STACK_MAX, BOONS, PROVIDED_BOONS } from "../../domain/data/boons";
import type { Boon, PlayerSummary } from "../../domain/types/log.types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/presentation/components/ui/table";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../utils/professionColors";
import CommanderIcon, { COMMANDER_ICON } from "./CommanderIcon";
import ProfessionIcon, { squadProfessionIcons } from "./ProfessionIcon";

interface Props {
  players: PlayerSummary[];
  isOwnAccount: (account: string) => boolean;
}

/** Boon icons from the GW2 wiki, saved as public/icons/<boon>.png. */
const boonIcon = (boon: Boon) => `/icons/${boon}.png`;

/** Every image the table shows — the log page preloads them, and the table waits for them before it appears. */
export const BOON_TABLE_IMAGES: readonly string[] = [...BOONS.map(boonIcon), COMMANDER_ICON];

const hasBoonData = (players: PlayerSummary[]) => players.some((p) => p.boons && Object.keys(p.boons).length > 0);
const average = (players: PlayerSummary[], boon: Boon) =>
  players.reduce((sum, p) => sum + (p.boons?.[boon] ?? 0), 0) / players.length;

/** Uptime of each boon per player (the "Boons" tab of a log), grouped by subgroup when the squad has several. */
export default function BoonTable({ players: squad, isOwnAccount }: Props) {
  const { t } = useI18n();
  const iconsReady = useImagesLoaded([...BOON_TABLE_IMAGES, ...squadProfessionIcons(squad)]);
  if (!iconsReady) {
    return (
      <div className="grid place-items-center py-10" role="status" aria-busy="true">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!hasBoonData(squad)) return <p className="py-6 text-sm text-muted-foreground">{t("logDetail.boonsNone")}</p>;

  const groups = [...new Set(squad.map((p) => p.group))].sort((a, b) => a - b);
  const bySubgroup = groups.length > 1;
  const sections = bySubgroup
    ? groups.map((g) => ({ group: g, players: squad.filter((p) => p.group === g).sort((a, b) => b.dps - a.dps) }))
    : [{ group: 0, players: squad }];

  const columns = BOONS.length + 1;

  return (
    <Table>
      {!bySubgroup && (
        <TableHeader>
          <HeaderRow label={<span>{t("logDetail.colCharacter")}</span>} />
        </TableHeader>
      )}
      <TableBody>
        {sections.flatMap((section, i) => [
          ...(bySubgroup
            ? [
                // Empty gap between subgroups, then the subgroup's own header: its name and the boon icons, one row.
                ...(i > 0
                  ? [
                      <TableRow key={`gap-${section.group}`} className="border-0 hover:bg-transparent">
                        <TableCell colSpan={columns} className="h-5 p-0" />
                      </TableRow>,
                    ]
                  : []),
                <HeaderRow
                  key={`header-${section.group}`}
                  className="border-b-2 bg-muted hover:bg-muted"
                  label={
                    <>
                      <span className="text-sm font-semibold">
                        {t("logDetail.subgroupTitle", { group: section.group })}
                      </span>
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {t("logDetail.subgroupPlayers", { count: section.players.length })}
                      </span>
                    </>
                  }
                />,
              ]
            : []),
          ...section.players.map((p) => (
            <TableRow
              key={p.account + p.name}
              className={cn(isOwnAccount(p.account) && "bg-warning/10 hover:bg-warning/15")}
            >
              <TableCell className="relative pr-16 font-medium">
                <ProviderBadges player={p} />
                <div className="flex items-center gap-2.5">
                  <ProfessionIcon profession={p.profession} className="size-7" />
                  <div>
                    <span className="inline-flex items-center gap-1.5">
                      <span style={{ color: professionColor(p.profession) }}>{p.name}</span>
                      {p.commander && <CommanderIcon label={t("logDetail.commander")} />}
                    </span>
                    <div className="text-xs font-normal text-muted-foreground">{p.account}</div>
                  </div>
                </div>
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

/** A header row: `label` in the first column, then every boon's icon (its name shows on hover). */
function HeaderRow({ label, className }: { label: ReactNode; className?: string }) {
  const { t } = useI18n();
  return (
    <TableRow className={className}>
      <TableHead>{label}</TableHead>
      {BOONS.map((boon) => {
        const name = t(`sessionExport.boons.${boon}`);
        return (
          <TableHead key={boon} className="text-center">
            <img src={boonIcon(boon)} alt={name} title={name} className="mx-auto size-6" />
          </TableHead>
        );
      })}
    </TableRow>
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

/** Boon icons in the name cell's top-right corner for the quickness / alacrity the player provides their subgroup. */
function ProviderBadges({ player }: { player: PlayerSummary }) {
  const { t } = useI18n();
  const provided = PROVIDED_BOONS.filter((b) => (player.generation?.[b] ?? 0) >= BOON_PROVIDER_MIN_GENERATION);
  if (!provided.length) return null;
  return (
    <span className="absolute top-1.5 right-2 flex gap-1">
      {provided.map((boon) => {
        const label = t("logDetail.providesBoon", {
          boon: t(`sessionExport.boons.${boon}`),
          value: Math.round(player.generation![boon]!),
        });
        return <img key={boon} src={boonIcon(boon)} alt={label} title={label} className="size-5 rounded-sm" />;
      })}
    </span>
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
