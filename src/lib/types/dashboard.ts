/**
 * Shared types for dashboard data.
 *
 * Kept in `lib/types/` so that both server-only query modules
 * and client components can import without circular deps.
 */

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
  if (raw && typeof raw === "object" && "name" in raw) {
    return raw as CategoryJoinRow;
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
  if (raw && typeof raw === "object" && "name" in raw) {
    return raw as GroupJoinRow;
  }
  return null;
}
