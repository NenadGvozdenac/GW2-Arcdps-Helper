import { Link } from "react-router-dom";
import { ChevronRightIcon } from "lucide-react";
import type { GroupClearProgress } from "../../domain/types/stats.types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/presentation/components/ui/card";
import { cn } from "@/presentation/lib/utils";

interface Props {
  label: string;
  to: string;
  resetLabel: string;
  progress: GroupClearProgress[];
}

export default function ClearCard({ label, to, resetLabel, progress }: Props) {
  return (
    <Link to={to} className="group block">
      <Card className="gap-3 transition-colors group-hover:border-foreground/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{label}</CardTitle>
            <CardDescription>{resetLabel}</CardDescription>
          </div>
          <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {progress.map(({ group, cleared, total }) => (
            <span
              key={group.id}
              title={`${group.name}: ${cleared}/${total}`}
              className={cn(
                "flex min-w-14 flex-col items-center rounded-md border px-2 py-1 text-xs font-semibold",
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
    </Link>
  );
}
