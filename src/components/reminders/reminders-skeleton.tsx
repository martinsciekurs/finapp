import { Skeleton } from "@/components/ui/skeleton";

function ReminderRowSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
      <Skeleton className="size-8 rounded-full" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-5 w-24" />
      {Array.from({ length: rows }).map((_, i) => (
        <ReminderRowSkeleton key={i} />
      ))}
    </div>
  );
}

export function RemindersSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Overdue section */}
      <SectionSkeleton rows={1} />

      {/* Upcoming section */}
      <SectionSkeleton rows={3} />

      {/* Paid section */}
      <SectionSkeleton rows={2} />
    </div>
  );
}
