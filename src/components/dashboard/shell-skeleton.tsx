import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton for the hero banner area */
function BannerSkeleton() {
  return (
    <Skeleton className="h-[140px] w-full rounded-2xl sm:h-[160px]" />
  );
}

/** Skeleton for the sidebar nav (desktop only) */
function SidebarSkeleton() {
  return (
    <div className="hidden lg:flex lg:w-[240px] lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <Skeleton className="h-6 w-20" />
      </div>
      {/* Nav items */}
      <div className="flex-1 space-y-2 p-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton className="size-5 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      {/* Settings */}
      <div className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Skeleton className="size-5 rounded" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton for the bottom nav (mobile only) */
function BottomNavSkeleton() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 block lg:hidden">
      <div className="mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-1 flex items-center justify-around rounded-2xl border border-border/50 bg-background/80 px-1.5 py-1.5 shadow-lg backdrop-blur-lg">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex min-h-[40px] min-w-[40px] items-center justify-center">
              <Skeleton className="size-4 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton for page content area */
function ContentSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-4 w-64" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/**
 * Full dashboard shell skeleton — used by loading.tsx for Suspense fallback.
 * Mirrors the layout of DashboardShell so the skeleton matches the real UI.
 */
export function DashboardShellSkeleton() {
  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar skeleton (desktop) */}
      <SidebarSkeleton />

      {/* Main content area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar skeleton */}
        <div className="flex h-14 items-center justify-between border-b border-border/50 px-4 sm:px-6 lg:px-8">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="size-8 rounded-md" />
        </div>

        {/* Banner + content */}
        <div className="flex-1 overflow-x-hidden">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
            <BannerSkeleton />
          </div>
          <div className="px-4 py-6 sm:px-6 lg:px-8">
            <ContentSkeleton />
          </div>
        </div>

        {/* Bottom spacer for mobile nav */}
        <div className="h-24 lg:hidden" />
      </div>

      {/* Bottom nav skeleton (mobile) */}
      <BottomNavSkeleton />
    </div>
  );
}

export { BannerSkeleton, SidebarSkeleton, BottomNavSkeleton, ContentSkeleton };
