import type { ReactNode } from "react";
import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon } from "lucide-react";
import { cn } from "@/presentation/lib/utils";

/** A headline number with its change against the previous period of the same length. */
export function StatTile({
  label,
  value,
  previous,
  upIsGood = true,
  period,
  detail,
}: {
  label: string;
  value: string;
  /** Raw counts for the delta; omit for a tile without one. */
  previous?: { now: number; prev: number };
  upIsGood?: boolean;
  period?: string;
  detail?: string;
}) {
  let delta: ReactNode = detail ? <span className="text-muted-foreground">{detail}</span> : null;
  if (previous) {
    const { now, prev } = previous;
    if (prev === 0) {
      delta = (
        <span className="flex flex-col text-muted-foreground">
          <span>—</span>
          <span>{now ? "none in the previous" : "none in either"} {period}</span>
        </span>
      );
    } else {
      const pct = Math.round(((now - prev) / prev) * 100);
      const good = pct === 0 ? null : pct > 0 === upIsGood;
      const Icon = pct > 0 ? ArrowUpRightIcon : pct < 0 ? ArrowDownRightIcon : ArrowRightIcon;
      delta = (
        <span className="flex flex-col">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium",
              good === true && "text-success",
              good === false && "text-destructive",
              good === null && "text-muted-foreground",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {pct > 0 ? "+" : ""}
            {pct}%
          </span>
          <span className="text-muted-foreground">vs previous {period}</span>
        </span>
      );
    }
  }
  return (
    <div className="flex flex-col gap-1 rounded-xl border bg-card px-5 py-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-3xl font-semibold tracking-tight">{value}</span>
      {delta && <span className="text-xs">{delta}</span>}
    </div>
  );
}
