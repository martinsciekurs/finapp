import { ContentSkeleton } from "@/components/dashboard/shell-skeleton";

/**
 * Dashboard page-level loading skeleton.
 * Renders inside the layout's {children} slot while a page is loading,
 * so the shell (sidebar, banner, nav) is already visible.
 */
export default function DashboardLoading() {
  return <ContentSkeleton />;
}
