/**
 * Shared types for the Budget system.
 *
 * Kept in `lib/types/` so that both server-only query modules
 * and client components can import without circular deps.
 */

// ────────────────────────────────────────────
// Track Mode
// ────────────────────────────────────────────

/** A single category's budget data for Track Mode display. */
export interface BudgetCategoryItem {
  id: string;
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  groupId: string;
  groupName: string;
  budgeted: number;
  spent: number;
}

/** An expense category with spending but no budget set. */
export interface UnbudgetedCategoryItem {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  groupId: string;
  groupName: string;
  spent: number;
}

/** Income summary for the budget page header. */
export interface BudgetSummary {
  incomeTarget: number;
  totalBudgeted: number;
  leftToAssign: number;
  totalSpent: number;
  leftToSpend: number;
}

/** Groups of budgeted categories for display. */
export interface BudgetGroupData {
  groupId: string;
  groupName: string;
  groupSortOrder: number;
  budgetedCategories: BudgetCategoryItem[];
  unbudgetedCategories: UnbudgetedCategoryItem[];
}

/** Full data for the Track Mode page. */
export interface BudgetPageData {
  summary: BudgetSummary;
  groups: BudgetGroupData[];
}

// ────────────────────────────────────────────
// Plan Mode
// ────────────────────────────────────────────

/** A single cell in the plan mode table. */
export interface PlanCell {
  yearMonth: string;
  budgeted: number;
  spent: number; // actual spending (0 for future months)
}

/** A category row in the plan mode table. */
export interface PlanCategoryRow {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  groupId: string;
  groupName: string;
  cells: PlanCell[]; // 12 months
}

/** Income target row in the plan mode table. */
export interface PlanIncomeRow {
  cells: { yearMonth: string; amount: number }[];
}

/** Full data for Plan Mode. */
export interface PlannerData {
  categories: PlanCategoryRow[];
  income: PlanIncomeRow;
  year: number;
}

// ────────────────────────────────────────────
// Smart Suggestions
// ────────────────────────────────────────────

export interface SpendingSuggestion {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  suggestedAmount: number; // 3-month avg, rounded up to nearest 10
}
