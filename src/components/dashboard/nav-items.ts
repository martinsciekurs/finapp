import {
  LayoutDashboard,
  ArrowLeftRight,
  PieChart,
  Clock,
  Landmark,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/**
 * Check if a nav item should be marked as active for the given pathname.
 * Uses exact match or segment-boundary prefix match to prevent partial hits
 * (e.g. "/dashboard/debts" won't activate "/dashboard/debts-archive").
 * Overview (/dashboard) is exact-match only to avoid false positives on sub-routes.
 */
export function isNavItemActive(href: string, pathname: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(href + "/");
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/dashboard/transactions", icon: ArrowLeftRight },
  { label: "Budget", href: "/dashboard/budget", icon: PieChart },
  { label: "Reminders", href: "/dashboard/reminders", icon: Clock },
  { label: "Debts", href: "/dashboard/debts", icon: Landmark },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];
