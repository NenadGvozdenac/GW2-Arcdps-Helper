import type { MouseEvent, ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";
import type { GroupClearProgress } from "../../domain/types/stats.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";

interface Props {
  label: string;
  to: string;
  resetLabel: string;
  progress: GroupClearProgress[];
  /** A button next to the title (e.g. fractal instabilities); clicking it does not open the page. */
  titleAction?: ReactNode;
}

/**
 * A clear's progress per wing / fractal / strike group, compact (three fit in a row); fills the height it is given
 * (cards in a row end level). The whole card opens `to`; the title is the link for keyboards and screen readers.
 */
export default function ClearCard({ label, to, resetLabel, progress, titleAction }: Props) {
  const navigate = useNavigate();
  // Links and buttons handle their own clicks; clicks from portals (a dialog opened here) are not in the card.
  const openPage = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as Element;
    if (!e.currentTarget.contains(target) || target.closest("a, button")) return;
    navigate(to);
  };

  return (
    <Card
      onClick={openPage}
      className="group h-full cursor-pointer gap-2.5 py-4 transition-colors hover:border-foreground/20"
    >
      <CardHeader className="flex flex-row items-center justify-between px-4">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <CardTitle>
              <Link to={to} className="outline-none focus-visible:underline">
                {label}
              </Link>
            </CardTitle>
            {titleAction}
          </div>
          <CardDescription>{resetLabel}</CardDescription>
        </div>
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </CardHeader>
      <CardContent className="flex flex-wrap gap-1.5 px-4">
        {progress.map(({ group, cleared, total }) => (
          <span
            key={group.id}
            title={`${group.name}: ${cleared}/${total}`}
            className={cn(
              "flex min-w-11 flex-col items-center rounded-md border px-1.5 py-0.5 text-[11px] leading-tight font-semibold",
              cleared === 0 && "text-muted-foreground",
              cleared > 0 && cleared < total && "border-warning/40 text-warning",
              cleared === total && "border-success/50 bg-success/10 text-success",
            )}
          >
            {group.short}
            <span className="font-normal">
              {cleared}/{total}
            </span>
          </span>
        ))}
      </CardContent>
    </Card>
  );
}
