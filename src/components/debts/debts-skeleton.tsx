import { Skeleton } from "@/components/ui/skeleton";

function DebtCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card px-4 py-4">
      <div className="space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-2 w-full" />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

export function DebtsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-14" />
        <DebtCardSkeleton />
      </div>

      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <DebtCardSkeleton />
      </div>
    </div>
  );
}
