import { Skeleton } from "@/components/ui/skeleton";

function SummaryCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupSkeleton() {
  return (
    <div>
      <Skeleton className="mb-2 h-3 w-24" />
      <div className="rounded-xl border bg-card shadow-sm">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-8 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BudgetSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="mt-1 h-4 w-56" />
      </div>

      {/* Tabs + period selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-8 w-64" />
      </div>

      {/* Summary card */}
      <SummaryCardSkeleton />

      {/* Groups */}
      <div className="space-y-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <GroupSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
