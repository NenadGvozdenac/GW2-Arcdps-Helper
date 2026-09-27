// Loading placeholders shaped like the real content, so pages don't jump when the data arrives.
import type { Category } from "../../domain/types/encounter.types";
import { encounterService } from "../../services/encounterService";
import { Card, CardContent, CardHeader } from "@/presentation/components/ui/card";
import { Skeleton } from "@/presentation/components/ui/skeleton";

type PageCategory = Exclude<Category, "other">;

const CATEGORIES: PageCategory[] = ["raid", "fractal", "strike"];

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Row of four StatCards. */
export function StatCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {range(4).map((i) => (
        <Card key={i} className="gap-1 py-4">
          <CardContent className="space-y-1 px-5">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-4 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** Rows of a LogTable (boss, result, duration, date). */
export function LogTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 py-1">
      {range(rows).map((i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-7" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="hidden h-4 w-12 sm:block" />
          <Skeleton className="hidden h-4 w-32 md:block" />
        </div>
      ))}
    </div>
  );
}

/** Overview: stat cards, one clear card per category and today's logs. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <StatCardsSkeleton />
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
        <CardContent>
          <LogTableSkeleton />
        </CardContent>
      </Card>
    </div>
  );
}

/** Raids / fractals / strikes: one card per group with a row per boss (stat cards are rendered separately). */
export function CategoryGroupsSkeleton({ category }: { category: PageCategory }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {encounterService.groupsFor(category).map((group) => (
        <Card key={group.id} className="gap-0 overflow-hidden py-0">
          <CardHeader className="flex flex-row items-center gap-3 border-b py-4">
            <Skeleton className="h-[22px] w-12" />
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <ul>
            {encounterService.encountersInGroup(group.id).map((e) => (
              <li key={e.key} className="flex items-center gap-3 border-t px-5 py-3 first:border-t-0">
                <Skeleton className="size-2.5 rounded-full" />
                <Skeleton className="h-6 w-44" />
                <Skeleton className="ml-auto h-4 w-20" />
                <Skeleton className="hidden h-3 w-24 sm:block" />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** Single log: back link, boss card, stat cards and the players table. */
export function LogDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-8 w-28" />
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5">
          <Skeleton className="size-16 rounded-lg" />
          <div className="min-w-48 flex-1 space-y-3">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-5 w-72" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
      <StatCardsSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="space-y-3">
          {range(10).map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-32 sm:block" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="hidden h-4 w-16 md:block" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Settings: the profile form (email + GW2 account + save button). */
export function ProfileFormSkeleton() {
  return (
    <Card aria-busy="true">
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div className="grid gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-5 w-72" />
        </div>
      </CardContent>
      <div className="px-6">
        <Skeleton className="h-9 w-20" />
      </div>
    </Card>
  );
}

/** Sessions list: a few session cards. */
export function SessionListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      {range(3).map((i) => (
        <Card key={i} className="gap-3 py-5">
          <CardContent className="flex flex-col gap-3 px-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="ml-auto h-4 w-4" />
            </div>
            <Skeleton className="h-4 w-64" />
            <div className="flex gap-2">
              {range(4).map((j) => (
                <Skeleton key={j} className="h-5 w-12 rounded-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** One session: back link, title, stat cards and the log table. */
export function SessionDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-8 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <StatCardsSkeleton />
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <LogTableSkeleton rows={8} />
        </CardContent>
      </Card>
    </div>
  );
}
