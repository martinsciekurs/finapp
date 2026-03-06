/**
 * Shared types for dashboard data.
 *
 * Kept in `lib/types/` so that both server-only query modules
 * and client components can import without circular deps.
 */

// ────────────────────────────────────────────
// Summary period filter
// ────────────────────────────────────────────

export type SummaryPeriod = "month" | "7d";

// ────────────────────────────────────────────
// Budget
// ────────────────────────────────────────────

export interface BudgetCategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  budgetLimit: number;
  spent: number;
}

export interface UnbudgetedCategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
}

export interface BudgetOverviewData {
  incomeTarget: number;
  totalBudgeted: number;
  budgetedCategories: BudgetCategoryData[];
  unbudgetedCategories: UnbudgetedCategoryData[];
}

/** Historical monthly spending per category for sparkline visualizations. */
export interface BudgetHistoricalData {
  /** Monthly spending amounts per category (oldest first). Key: category ID */
  spendingByCategory: Record<string, number[]>;
  /** Short month labels, e.g. ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"] */
  monthLabels: string[];
}

// ────────────────────────────────────────────
// Recent Transactions
// ────────────────────────────────────────────

export interface RecentTransactionData {
  id: string;
  amount: number;
  type: "expense" | "income";
  description: string;
  date: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string | null;
}

// ────────────────────────────────────────────
// Supabase join helpers
// ────────────────────────────────────────────

/** Shape returned by `categories(name, icon, color)` join in Supabase queries. */
export interface CategoryJoinRow {
  name: string;
  icon: string;
  color: string;
}

/**
 * Safely parse the category join result from a Supabase query.
 *
 * Supabase's generated types don't accurately reflect the nested join shape,
 * so we do a lightweight runtime check instead of an unsafe double-cast.
 */
export function parseCategoryJoin(raw: unknown): CategoryJoinRow | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.name === "string" &&
    typeof candidate.icon === "string" &&
    typeof candidate.color === "string"
  ) {
    return {
      name: candidate.name,
      icon: candidate.icon,
      color: candidate.color,
    };
  }

  return null;
}

/** Shape returned by `category_groups(name)` join in Supabase queries. */
export interface GroupJoinRow {
  name: string;
}

/**
 * Safely parse the category_groups join result from a Supabase query.
 */
export function parseGroupJoin(raw: unknown): GroupJoinRow | null {
  if (raw && typeof raw === "object" && "name" in raw && typeof (raw as Record<string, unknown>).name === "string") {
    return raw as GroupJoinRow;
  }
  return null;
}
