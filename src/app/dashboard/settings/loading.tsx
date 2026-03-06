import { Skeleton } from "@/components/ui/skeleton";
import {
  DashboardShellSkeleton,
  SidebarSkeleton,
  BottomNavSkeleton,
} from "@/components/dashboard/shell-skeleton";

export default function SettingsLoading() {
  return (
    <div className="flex min-h-screen bg-background">
      <SidebarSkeleton />

      <div className="flex flex-1 flex-col">
        <div className="flex h-14 items-center justify-end border-b border-border/50 px-4 sm:px-6 lg:px-8">
          <Skeleton className="size-8 rounded-md" />
        </div>

        <div className="flex-1">
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="space-y-6">
              <div>
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-40 mt-1.5" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-6">
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="h-24 lg:hidden" />
        </div>
      </div>

      <BottomNavSkeleton />
    </div>
  );
}
