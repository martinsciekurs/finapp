import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for the transaction form.
 */
function FormSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
      {/* Type toggle */}
      <Skeleton className="mb-4 h-9 w-48 rounded-lg" />

      {/* Form fields */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>

      {/* Submit button */}
      <div className="mt-4 flex justify-end">
        <Skeleton className="h-8 w-28 rounded-md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the transaction list.
 */
function ListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <Skeleton className="h-9 w-52 rounded-lg" />

      {/* Date groups */}
      {Array.from({ length: 2 }).map((_, groupIndex) => (
        <div key={groupIndex}>
          {/* Date header */}
          <Skeleton className="mb-2 h-3 w-24" />
          {/* Transaction rows */}
          <div className="rounded-xl border bg-card shadow-sm">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-3">
                <Skeleton className="size-9 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full transactions page skeleton — used by loading.tsx for Suspense fallback.
 */
export function TransactionsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>

      <FormSkeleton />
      <ListSkeleton />
    </div>
  );
}

export { FormSkeleton, ListSkeleton };
