import type { Category } from "../../domain/types/encounter.types";
import { encounterService } from "../../services/encounterService";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Skeleton } from "@/presentation/components/ui/skeleton";

const CATEGORIES: Exclude<Category, "other">[] = ["raid", "fractal", "strike"];
const LOG_ROWS = 5;

/** Placeholder with the same layout as the overview (stat cards, clear cards, today's logs) while logs load. */
export default function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Card key={i} className="gap-1 py-4">
            <CardContent className="space-y-1 px-5">
              <Skeleton className="h-8 w-14" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {CATEGORIES.map((category) => (
          <Card key={category} className="gap-3">
            <CardHeader className="gap-0">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {encounterService.groupsFor(category).map((g) => (
                <Skeleton key={g.id} className="h-[42px] w-14" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </div>
          <Skeleton className="h-8 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: LOG_ROWS }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-7" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="hidden h-4 w-12 sm:block" />
              <Skeleton className="hidden h-4 w-32 md:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
