import { TooltipProvider } from "@/components/ui/tooltip";
import { HeroBanner } from "./hero-banner";
import { SidebarNav } from "./sidebar-nav";
import { BottomNav } from "./bottom-nav";
import { NotificationBell } from "./notification-bell";
import { TourLauncher } from "@/components/tour/tour-launcher";
import type { BannerData } from "@/lib/config/banners";

interface DashboardShellProps {
  displayName: string;
  banner: BannerData | null;
  showTour: boolean;
  children: React.ReactNode;
}

export function DashboardShell({
  displayName,
  banner,
  showTour,
  children,
}: DashboardShellProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex min-h-screen bg-background">
        {/* Skip to content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
        >
          Skip to content
        </a>

        {/* Desktop sidebar */}
        <SidebarNav />

        {/* Main content area */}
        <div className="flex flex-1 flex-col">
          {/* Top bar with notification bell */}
          <header className="flex h-14 items-center justify-end border-b border-border/50 px-4 sm:px-6 lg:px-8">
            <NotificationBell />
          </header>

          {/* Hero banner + page content */}
          <main id="main-content" className="flex-1">
            <div className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
              <HeroBanner displayName={displayName} banner={banner} />
            </div>

            <div className="px-4 py-6 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>

          {/* Bottom spacer for mobile nav */}
          <div className="h-24 lg:hidden" />
        </div>

        {/* Mobile bottom nav */}
        <BottomNav />

        {showTour ? <TourLauncher showTour={showTour} /> : null}
      </div>
    </TooltipProvider>
  );
}
