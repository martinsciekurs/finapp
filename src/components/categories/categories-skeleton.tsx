import { Skeleton } from "@/components/ui/skeleton";

function GroupSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      {/* Group header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-1">
          <Skeleton className="size-7 rounded-md" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      </div>
      {/* Category rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-8 rounded-lg" />
          <Skeleton className="h-4 w-32" />
          <div className="flex-1" />
          <Skeleton className="size-7 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function CategoriesSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-1 h-4 w-72" />
      </div>

      {/* Tab toggle + buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>

      {/* Group skeletons */}
      <div className="space-y-4">
        <GroupSkeleton rows={5} />
        <GroupSkeleton rows={4} />
        <GroupSkeleton rows={3} />
      </div>
    </div>
  );
}
