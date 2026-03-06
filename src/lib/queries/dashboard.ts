import "server-only";

import { createClient } from "@/lib/supabase/server";
import {
  getCurrentMonthRange,
  getMonthRange,
  getLast7DaysStart,
  formatDateForInput,
} from "@/lib/utils/date";
import { getTransactionCategoryDisplay } from "@/lib/utils/transactions";
import type {
  BudgetCategoryData,
  BudgetHistoricalData,
  BudgetOverviewData,
  UnbudgetedCategoryData,
  RecentTransactionData,
} from "@/lib/types/dashboard";
import { parseCategoryJoin } from "@/lib/types/dashboard";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface DashboardSummary {
  totalSpent: number;
  totalIncome: number;
  weeklySpending: number;
  weeklyIncome: number;
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
  let weeklyIncome = 0;
  const spentByCategory = new Map<string, number>();

  for (const tx of txList) {
    const inCurrentMonth = tx.date >= start && tx.date < end;
    const inLastWeek = tx.date >= weekStart && tx.date <= today;

    if (tx.type === "expense") {
      if (inCurrentMonth) {
        totalSpent += tx.amount;
        spentByCategory.set(
          tx.category_id,
          (spentByCategory.get(tx.category_id) ?? 0) + tx.amount
        );
      }
      if (inLastWeek) {
        weeklySpending += tx.amount;
      }
    }

    if (tx.type === "income") {
      if (inCurrentMonth) {
        totalIncome += tx.amount;
      }
      if (inLastWeek) {
        weeklyIncome += tx.amount;
      }
    }
  }

  return {
    summary: { totalSpent, totalIncome, weeklySpending, weeklyIncome },
    spentByCategory,
  };
}

/**
 * Fetch all data needed for the dashboard budget overview widget.
 *
 * Returns the monthly income target, total budgeted amount,
 * budgeted categories with spending, and unbudgeted expense categories
 * that have spending this month.
 */
export async function fetchBudgetOverviewData(
  spentByCategory: Map<string, number>
): Promise<BudgetOverviewData> {
  const supabase = await createClient();
  const { start } = getCurrentMonthRange();
  const yearMonth = start.substring(0, 7); // "YYYY-MM"

  // Fetch income target, budgets, and categories in parallel
  const [incomeResult, budgetResult, categoriesResult] = await Promise.all([
    supabase
      .from("monthly_income_targets")
      .select("amount")
      .eq("year_month", yearMonth)
      .maybeSingle(),
    supabase
      .from("category_budgets")
      .select("category_id, amount, categories(name, icon, color)")
      .eq("year_month", yearMonth),
    supabase
      .from("categories")
      .select("id, name, icon, color")
      .eq("type", "expense")
      .order("sort_order", { ascending: true }),
  ]);

  if (incomeResult.error) {
    throw new Error(
      `Failed to fetch income target: ${incomeResult.error.message}`
    );
  }
  if (budgetResult.error) {
    throw new Error(
      `Failed to fetch budget categories: ${budgetResult.error.message}`
    );
  }
  if (categoriesResult.error) {
    throw new Error(
      `Failed to fetch expense categories: ${categoriesResult.error.message}`
    );
  }

  const incomeTarget = incomeResult.data?.amount ?? 0;

  // Build budgeted categories
  const budgetedCategoryIds = new Set<string>();
  const budgetedCategories: BudgetCategoryData[] = [];
  let totalBudgeted = 0;

  for (const b of budgetResult.data ?? []) {
    const cat = parseCategoryJoin(b.categories);
    if (!cat) continue;
    budgetedCategoryIds.add(b.category_id);
    totalBudgeted += b.amount;
    budgetedCategories.push({
      id: b.category_id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      budgetLimit: b.amount,
      spent: spentByCategory.get(b.category_id) ?? 0,
    });
  }

  const allExpenseCategories = categoriesResult.data ?? [];

  // Unbudgeted = expense categories without a budget that have spending this month
  const unbudgetedCategories: UnbudgetedCategoryData[] = allExpenseCategories
    .filter((c) => !budgetedCategoryIds.has(c.id) && (spentByCategory.get(c.id) ?? 0) > 0)
    .map((c) => ({
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      spent: spentByCategory.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.spent - a.spent);

  return {
    incomeTarget,
    totalBudgeted,
    budgetedCategories,
    unbudgetedCategories,
  };
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
    const categoryDisplay = getTransactionCategoryDisplay(tx.categories);
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type as "expense" | "income",
      description: tx.description ?? "",
      date: tx.date,
      ...categoryDisplay,
    };
  });
}

/**
 * Fetch last 6 months of expense spending grouped by category for sparkline charts.
 * Includes the current (partial) month as the last data point.
 */
export async function fetchBudgetHistoricalSpending(): Promise<BudgetHistoricalData> {
  const supabase = await createClient();
  const now = new Date();

  // Build 6 month windows: 5 completed + current partial
  const months: { ym: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-US", { month: "short" });
    months.push({ ym, label });
  }

  const { start: earliest } = getMonthRange(months[0]!.ym);
  const { end: latest } = getMonthRange(months[months.length - 1]!.ym);

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("amount, category_id, date")
    .eq("type", "expense")
    .gte("date", earliest)
    .lt("date", latest);

  if (error) {
    throw new Error(`Failed to fetch historical spending: ${error.message}`);
  }

  // Group: categoryId → yearMonth → total
  const spendingMap = new Map<string, Map<string, number>>();
  for (const tx of transactions ?? []) {
    const ym = tx.date.substring(0, 7);
    let catSpending = spendingMap.get(tx.category_id);
    if (!catSpending) {
      catSpending = new Map();
      spendingMap.set(tx.category_id, catSpending);
    }
    catSpending.set(ym, (catSpending.get(ym) ?? 0) + tx.amount);
  }

  // Flatten into arrays (one value per month, oldest first)
  const spendingByCategory: Record<string, number[]> = {};
  for (const [catId, catSpending] of spendingMap) {
    spendingByCategory[catId] = months.map((m) => catSpending.get(m.ym) ?? 0);
  }

  return {
    spendingByCategory,
    monthLabels: months.map((m) => m.label),
  };
}
