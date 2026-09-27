import { useI18n } from "../../../controllers/I18nController";
import { Badge } from "@/presentation/components/ui/badge";
import { cn } from "@/presentation/lib/utils";
import { professionColor } from "../../utils/professionColors";
import { cmBadge, failBadge, successBadge } from "../ResultBadge";

/** Illustrative data for the landing page — not a real account. */
const WEEKLY = [
  { short: "W1", cleared: 3, total: 3 },
  { short: "W2", cleared: 3, total: 3 },
  { short: "W3", cleared: 4, total: 4 },
  { short: "W4", cleared: 4, total: 4 },
  { short: "W5", cleared: 2, total: 4 },
  { short: "W6", cleared: 3, total: 3 },
  { short: "W7", cleared: 1, total: 3 },
  { short: "W8", cleared: 0, total: 3 },
];

const DAILY = [
  { short: "100", cleared: 1, total: 1 },
  { short: "99", cleared: 1, total: 1 },
  { short: "98", cleared: 3, total: 3 },
  { short: "97", cleared: 2, total: 3 },
  { short: "96", cleared: 0, total: 3 },
];

const LOGS = [
  { boss: "Ura", group: "W8", kill: true, cm: "CM", time: "6:48" },
  { boss: "Cerus", group: "SotO", kill: true, cm: "LCM", time: "8:02" },
  { boss: "Kanaxai", group: "99 CM", kill: true, cm: "CM", time: "4:31" },
  { boss: "Decima", group: "W8", kill: false, hp: "12.4%", time: "7:15" },
];

const SQUAD = [
  { spec: "Virtuoso", dps: 41.2 },
  { spec: "Weaver", dps: 38.9 },
  { spec: "Harbinger", dps: 36.5 },
  { spec: "Mechanist", dps: 33.1 },
  { spec: "Firebrand", dps: 9.8 },
];

function ClearPills({ items }: { items: { short: string; cleared: number; total: number }[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((p) => (
        <span
          key={p.short}
          className={cn(
            "flex min-w-11 flex-col items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold",
            p.cleared === 0 && "text-muted-foreground",
            p.cleared > 0 && p.cleared < p.total && "border-warning/40 text-warning",
            p.cleared === p.total && "border-success/50 bg-success/10 text-success",
          )}
        >
          {p.short}
          <span className="font-normal">
            {p.cleared}/{p.total}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function DashboardPreview() {
  const { t } = useI18n();
  const maxDps = Math.max(...SQUAD.map((s) => s.dps));

  return (
    <div className="relative" aria-hidden="true">
      <div className="landing-border rounded-2xl bg-card/95 p-4 shadow-2xl shadow-black/40 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-destructive/70" />
          <span className="size-2.5 rounded-full bg-warning/70" />
          <span className="size-2.5 rounded-full bg-success/70" />
          <span className="ml-3 text-xs font-medium text-muted-foreground">gw2-arcdps-helper</span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-success">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            {t("landing.preview.live")}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border bg-background/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("landing.preview.weekly")}</p>
            <ClearPills items={WEEKLY} />
          </div>
          <div className="rounded-xl border bg-background/40 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">{t("landing.preview.daily")} · CM</p>
            <ClearPills items={DAILY} />
          </div>
        </div>

        <div className="mt-3 rounded-xl border bg-background/40 p-3">
          <p className="mb-1 text-xs font-medium text-muted-foreground">{t("landing.preview.today")}</p>
          <ul className="divide-y">
            {LOGS.map((l) => (
              <li key={l.boss} className="flex items-center gap-3 py-2 text-sm">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-bold">
                  {l.boss.slice(0, 2)}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{l.boss}</span>
                <span className="hidden text-xs text-muted-foreground sm:inline">{l.group}</span>
                <span className="flex gap-1">
                  <Badge variant="outline" className={l.kill ? successBadge : failBadge}>
                    {l.kill ? t("common.kill") : `${t("common.wipe")} · ${l.hp}`}
                  </Badge>
                  {l.cm && (
                    <Badge variant="outline" className={cmBadge}>
                      {l.cm}
                    </Badge>
                  )}
                </span>
                <span className="w-10 text-right font-mono text-xs tabular-nums text-muted-foreground">{l.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Floating squad DPS card. */}
      <div className="landing-border absolute -bottom-28 -left-4 hidden w-60 rounded-xl bg-card/95 p-3 shadow-xl shadow-black/40 md:block lg:-left-12">
        <p className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
          Ura · CM <span className="font-mono">DPS</span>
        </p>
        <ul className="space-y-1.5">
          {SQUAD.map((s, i) => (
            <li key={s.spec} className="flex items-center gap-2 text-[11px]">
              <span className="w-16 truncate text-muted-foreground">{s.spec}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full origin-left rounded-full"
                  style={{
                    width: `${(s.dps / maxDps) * 100}%`,
                    backgroundColor: professionColor(s.spec),
                    animation: `landing-bar 1.2s ${0.4 + i * 0.12}s cubic-bezier(0.2,0.7,0.2,1) backwards`,
                  }}
                />
              </span>
              <span className="w-9 text-right font-mono tabular-nums">{s.dps}k</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
