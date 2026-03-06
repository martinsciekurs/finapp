import { Skeleton } from "@/components/ui/skeleton";
import {
  SidebarSkeleton,
  BottomNavSkeleton,
} from "@/components/dashboard/shell-skeleton";

export default function ProfileLoading() {
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
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-32" />
                <Skeleton className="h-4 w-64 mt-2" />
              </div>

              <div className="max-w-2xl space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>

                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>

                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>

                <div className="border-t" />

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>

                  <Skeleton className="h-10 w-32 rounded-lg" />
                </div>
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
