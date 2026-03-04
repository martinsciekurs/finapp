import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthRange,
  getLast7DaysStart,
  formatDateForInput,
} from "@/lib/utils/date";
import type { BudgetCategoryData, RecentTransactionData } from "@/lib/types/dashboard";
import { parseCategoryJoin } from "@/lib/types/dashboard";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface DashboardSummary {
  totalSpent: number;
  totalIncome: number;
  weeklySpending: number;
}

// ────────────────────────────────────────────
// Fetchers
// ────────────────────────────────────────────

/**
 * Fetch the authenticated user's currency from their profile.
 */
export async function fetchUserCurrency(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "EUR";

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user currency: ${error.message}`);
  }

  return profile?.currency ?? "EUR";
}

/**
 * Fetch current-month transactions and compute summary totals.
 * Also returns per-category spending for budget calculations.
 */
export async function fetchMonthlySummary(): Promise<{
  summary: DashboardSummary;
  spentByCategory: Map<string, number>;
}> {
  const supabase = await createClient();
  const { start, end } = getCurrentMonthRange();
  const weekStart = getLast7DaysStart();
  const today = formatDateForInput(new Date());

  // Use the earlier of month-start and week-start so the 7-day window
  // isn't truncated at the month boundary (e.g. March 3 → Feb 25).
  const earliest = start < weekStart ? start : weekStart;

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, type, category_id, date")
    .gte("date", earliest)
    .lt("date", end);

  if (error) {
    throw new Error(`Failed to fetch monthly transactions: ${error.message}`);
  }

  const txList = transactions ?? [];

  let totalSpent = 0;
  let totalIncome = 0;
  let weeklySpending = 0;
  const spentByCategory = new Map<string, number>();

  for (const tx of txList) {
    const inCurrentMonth = tx.date >= start && tx.date < end;

    if (tx.type === "expense") {
      if (inCurrentMonth) {
        totalSpent += tx.amount;
        spentByCategory.set(
          tx.category_id,
          (spentByCategory.get(tx.category_id) ?? 0) + tx.amount
        );
      }
      if (tx.date >= weekStart && tx.date <= today) {
        weeklySpending += tx.amount;
      }
    } else if (inCurrentMonth) {
      totalIncome += tx.amount;
    }
  }

  return {
    summary: { totalSpent, totalIncome, weeklySpending },
    spentByCategory,
  };
}

/**
 * Fetch the count of unpaid reminders with a due date of today or later.
 */
export async function fetchUpcomingRemindersCount(): Promise<number> {
  const supabase = await createClient();
  const today = formatDateForInput(new Date());

  const { count, error } = await supabase
    .from("reminders")
    .select("id", { count: "exact", head: true })
    .eq("is_paid", false)
    .gte("due_date", today);

  if (error) {
    throw new Error(`Failed to fetch reminders count: ${error.message}`);
  }

  return count ?? 0;
}

/**
 * Fetch expense categories with budget data for the dashboard overview.
 *
 * NOTE: Budget limits have moved from `categories.budget_limit` to the
 * `category_budgets` table (per-month). This function returns an empty
 * array until Phase 2D-ii implements the new budget system.
 */
export async function fetchBudgetCategories(
  _spentByCategory: Map<string, number>
): Promise<BudgetCategoryData[]> {
  // TODO(Phase 2D-ii): Query category_budgets for current month,
  // merge with spending data, and return BudgetCategoryData[].
  void _spentByCategory;
  return [];
}

/**
 * Fetch the most recent transactions with their category info.
 */
export async function fetchRecentTransactions(
  limit = 5
): Promise<RecentTransactionData[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("transactions")
    .select("id, amount, type, description, date, categories(name, icon, color)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent transactions: ${error.message}`);
  }

  return (rows ?? []).map((tx) => {
    const cat = parseCategoryJoin(tx.categories);
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      categoryName: cat?.name ?? "Uncategorized",
      categoryIcon: cat?.icon ?? "circle",
      categoryColor: cat?.color ?? null,
    };
  });
}
