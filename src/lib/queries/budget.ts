import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getMonthRange } from "@/lib/utils/date";
import type {
  BudgetPageData,
  BudgetGroupData,
  PlannerData,
  PlanCategoryRow,
  PlanCell,
  SpendingSuggestion,
} from "@/lib/types/budget";

// ────────────────────────────────────────────
// Track Mode
// ────────────────────────────────────────────

/**
 * Fetch all data needed for the budget Track Mode page.
 *
 * Returns: income target, all category budgets for the month,
 * actual spending per expense category, grouped by category_groups.
 */
export async function fetchBudgetPageData(
  yearMonth: string
): Promise<BudgetPageData> {
  const supabase = await createClient();
  const { start, end } = getMonthRange(yearMonth);

  // Parallel fetches: income target, category budgets, expense categories + groups, transactions
  const [incomeResult, budgetResult, groupResult, catResult, txResult] =
    await Promise.all([
      supabase
        .from("monthly_income_targets")
        .select("amount")
        .eq("year_month", yearMonth)
        .maybeSingle(),
      supabase
        .from("category_budgets")
        .select("id, category_id, amount")
        .eq("year_month", yearMonth),
      supabase
        .from("category_groups")
        .select("id, name, sort_order")
        .eq("type", "expense")
        .order("sort_order", { ascending: true }),
      supabase
        .from("categories")
        .select("id, name, icon, color, group_id, sort_order")
        .eq("type", "expense")
        .order("sort_order", { ascending: true }),
      supabase
        .from("transactions")
        .select("amount, category_id")
        .eq("type", "expense")
        .gte("date", start)
        .lt("date", end),
    ]);

  if (incomeResult.error) {
    throw new Error(`Failed to fetch income target: ${incomeResult.error.message}`);
  }
  if (budgetResult.error) {
    throw new Error(`Failed to fetch category budgets: ${budgetResult.error.message}`);
  }
  if (groupResult.error) {
    throw new Error(`Failed to fetch category groups: ${groupResult.error.message}`);
  }
  if (catResult.error) {
    throw new Error(`Failed to fetch categories: ${catResult.error.message}`);
  }
  if (txResult.error) {
    throw new Error(`Failed to fetch transactions: ${txResult.error.message}`);
  }

  // Build spending map: categoryId -> total spent
  const spentMap = new Map<string, number>();
  for (const tx of txResult.data ?? []) {
    spentMap.set(tx.category_id, (spentMap.get(tx.category_id) ?? 0) + tx.amount);
  }

  // Build budget map: categoryId -> { id, amount }
  const budgetMap = new Map<string, { id: string; amount: number }>();
  for (const b of budgetResult.data ?? []) {
    budgetMap.set(b.category_id, { id: b.id, amount: b.amount });
  }

  // Build group map: groupId -> { name, sortOrder }
  const groupMap = new Map<string, { name: string; sortOrder: number }>();
  for (const g of groupResult.data ?? []) {
    groupMap.set(g.id, { name: g.name, sortOrder: g.sort_order });
  }

  // Build groups with budgeted and unbudgeted categories
  const groupsMap = new Map<string, BudgetGroupData>();

  for (const cat of catResult.data ?? []) {
    const group = groupMap.get(cat.group_id);
    if (!group) continue;

    let groupData = groupsMap.get(cat.group_id);
    if (!groupData) {
      groupData = {
        groupId: cat.group_id,
        groupName: group.name,
        groupSortOrder: group.sortOrder,
        budgetedCategories: [],
        unbudgetedCategories: [],
      };
      groupsMap.set(cat.group_id, groupData);
    }

    const budget = budgetMap.get(cat.id);
    const spent = spentMap.get(cat.id) ?? 0;

    if (budget) {
      groupData.budgetedCategories.push({
        id: budget.id,
        categoryId: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        groupId: cat.group_id,
        groupName: group.name,
        budgeted: budget.amount,
        spent,
      });
    } else if (spent > 0) {
      groupData.unbudgetedCategories.push({
        categoryId: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        groupId: cat.group_id,
        groupName: group.name,
        spent,
      });
    }
  }

  // Sort groups by sortOrder, filter empty
  const groups = Array.from(groupsMap.values())
    .filter((g) => g.budgetedCategories.length > 0 || g.unbudgetedCategories.length > 0)
    .sort((a, b) => a.groupSortOrder - b.groupSortOrder);

  // Compute summary
  const incomeTarget = incomeResult.data?.amount ?? 0;
  const totalBudgeted = (budgetResult.data ?? []).reduce(
    (sum, b) => sum + b.amount,
    0
  );
  const totalSpent = Array.from(spentMap.values()).reduce(
    (sum, s) => sum + s,
    0
  );

  return {
    summary: {
      incomeTarget,
      totalBudgeted,
      leftToAssign: incomeTarget - totalBudgeted,
      totalSpent,
      leftToSpend: totalBudgeted - totalSpent,
    },
    groups,
  };
}

// ────────────────────────────────────────────
// Plan Mode
// ────────────────────────────────────────────

/**
 * Fetch all data needed for the Plan Mode page.
 *
 * Returns: all 12 months of category_budgets + income targets + actual spending.
 */
export async function fetchPlannerData(year: number): Promise<PlannerData> {
  const supabase = await createClient();

  const yearStart = `${year}-01`;
  const yearEnd = `${year}-12`;
  const dateStart = `${year}-01-01`;
  const dateEnd = `${year + 1}-01-01`;

  const [budgetResult, incomeResult, catResult, groupResult, txResult] =
    await Promise.all([
      supabase
        .from("category_budgets")
        .select("category_id, year_month, amount")
        .gte("year_month", yearStart)
        .lte("year_month", yearEnd),
      supabase
        .from("monthly_income_targets")
        .select("year_month, amount")
        .gte("year_month", yearStart)
        .lte("year_month", yearEnd),
      supabase
        .from("categories")
        .select("id, name, icon, color, group_id, sort_order")
        .eq("type", "expense")
        .order("sort_order", { ascending: true }),
      supabase
        .from("category_groups")
        .select("id, name, sort_order")
        .eq("type", "expense")
        .order("sort_order", { ascending: true }),
      supabase
        .from("transactions")
        .select("amount, category_id, date")
        .eq("type", "expense")
        .gte("date", dateStart)
        .lt("date", dateEnd),
    ]);

  if (budgetResult.error) throw new Error(`Failed to fetch budgets: ${budgetResult.error.message}`);
  if (incomeResult.error) throw new Error(`Failed to fetch income: ${incomeResult.error.message}`);
  if (catResult.error) throw new Error(`Failed to fetch categories: ${catResult.error.message}`);
  if (groupResult.error) throw new Error(`Failed to fetch groups: ${groupResult.error.message}`);
  if (txResult.error) throw new Error(`Failed to fetch transactions: ${txResult.error.message}`);

  // Build all 12 month keys
  const months: string[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push(`${year}-${String(m).padStart(2, "0")}`);
  }

  // Budget map: categoryId -> yearMonth -> amount
  const budgetMap = new Map<string, Map<string, number>>();
  for (const b of budgetResult.data ?? []) {
    let catBudgets = budgetMap.get(b.category_id);
    if (!catBudgets) {
      catBudgets = new Map();
      budgetMap.set(b.category_id, catBudgets);
    }
    catBudgets.set(b.year_month, b.amount);
  }

  // Spending map: categoryId -> yearMonth -> amount
  const spendingMap = new Map<string, Map<string, number>>();
  for (const tx of txResult.data ?? []) {
    const ym = tx.date.substring(0, 7); // "YYYY-MM"
    let catSpending = spendingMap.get(tx.category_id);
    if (!catSpending) {
      catSpending = new Map();
      spendingMap.set(tx.category_id, catSpending);
    }
    catSpending.set(ym, (catSpending.get(ym) ?? 0) + tx.amount);
  }

  // Group map for display ordering
  const groupMap = new Map<string, { name: string; sortOrder: number }>();
  for (const g of groupResult.data ?? []) {
    groupMap.set(g.id, { name: g.name, sortOrder: g.sort_order });
  }

  // Build category rows
  const catDataMap = new Map((catResult.data ?? []).map((c) => [c.id, c]));
  const categories: PlanCategoryRow[] = (catResult.data ?? []).map((cat) => {
    const group = groupMap.get(cat.group_id);
    const cells: PlanCell[] = months.map((ym) => ({
      yearMonth: ym,
      budgeted: budgetMap.get(cat.id)?.get(ym) ?? 0,
      spent: spendingMap.get(cat.id)?.get(ym) ?? 0,
    }));

    return {
      categoryId: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      groupId: cat.group_id,
      groupName: group?.name ?? "Uncategorized",
      cells,
    };
  });

  // Sort by group sort order, then category sort order
  categories.sort((a, b) => {
    const ga = groupMap.get(a.groupId)?.sortOrder ?? 0;
    const gb = groupMap.get(b.groupId)?.sortOrder ?? 0;
    if (ga !== gb) return ga - gb;
    return (catDataMap.get(a.categoryId)?.sort_order ?? 0) -
      (catDataMap.get(b.categoryId)?.sort_order ?? 0);
  });

  // Income targets map
  const incomeMap = new Map<string, number>();
  for (const inc of incomeResult.data ?? []) {
    incomeMap.set(inc.year_month, inc.amount);
  }

  const income = {
    cells: months.map((ym) => ({
      yearMonth: ym,
      amount: incomeMap.get(ym) ?? 0,
    })),
  };

  return { categories, income, year };
}

// ────────────────────────────────────────────
// Smart Suggestions
// ────────────────────────────────────────────

/**
 * Compute spending suggestions based on average of last 3 completed months.
 * Returns average spending per category, rounded up to nearest 10.
 * Only divides by the number of months that actually have data.
 */
export async function fetchSpendingSuggestions(): Promise<SpendingSuggestion[]> {
  const supabase = await createClient();

  // Get last 3 completed months
  const now = new Date();
  const monthRanges: { start: string; end: string; ym: string }[] = [];
  for (let i = 1; i <= 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthRanges.push({ ...getMonthRange(ym), ym });
  }

  const earliest = monthRanges[monthRanges.length - 1]!.start;
  const latest = monthRanges[0]!.end;

  const [txResult, catResult] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, category_id, date")
      .eq("type", "expense")
      .gte("date", earliest)
      .lt("date", latest),
    supabase
      .from("categories")
      .select("id, name, icon, color")
      .eq("type", "expense"),
  ]);

  if (txResult.error) throw new Error(`Failed to fetch transactions: ${txResult.error.message}`);
  if (catResult.error) throw new Error(`Failed to fetch categories: ${catResult.error.message}`);

  // Track which months have any data per category
  const spentByMonth = new Map<string, Map<string, number>>(); // categoryId -> ym -> amount
  for (const tx of txResult.data ?? []) {
    const ym = tx.date.substring(0, 7);
    let catMonths = spentByMonth.get(tx.category_id);
    if (!catMonths) {
      catMonths = new Map();
      spentByMonth.set(tx.category_id, catMonths);
    }
    catMonths.set(ym, (catMonths.get(ym) ?? 0) + tx.amount);
  }

  // Build category lookup
  const catMap = new Map(
    (catResult.data ?? []).map((c) => [c.id, c])
  );

  const suggestions: SpendingSuggestion[] = [];
  for (const [catId, monthData] of spentByMonth) {
    const cat = catMap.get(catId);
    if (!cat) continue;

    const totalSpent = Array.from(monthData.values()).reduce((s, v) => s + v, 0);
    const monthsWithData = monthData.size;
    if (monthsWithData === 0) continue;

    const avg = totalSpent / monthsWithData;
    const rounded = Math.ceil(avg / 10) * 10;

    if (rounded > 0) {
      suggestions.push({
        categoryId: catId,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        suggestedAmount: rounded,
      });
    }
  }

  // Sort by suggested amount descending
  suggestions.sort((a, b) => b.suggestedAmount - a.suggestedAmount);
  return suggestions;
}
