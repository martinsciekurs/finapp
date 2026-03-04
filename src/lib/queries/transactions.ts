import "server-only";

import { createClient } from "@/lib/supabase/server";
import { parseCategoryJoin } from "@/lib/types/dashboard";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Fetch all transactions for the current user
// ────────────────────────────────────────────

/**
 * Fetch transactions ordered by date (newest first).
 * Joins category data for display.
 */
export async function fetchTransactions(): Promise<TransactionData[]> {
  const supabase = await createClient();

  const { data: rows, error } = await supabase
    .from("transactions")
    .select(
      "id, amount, type, description, date, category_id, categories(name, icon, color)"
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }

  return (rows ?? []).map((tx) => {
    const cat = parseCategoryJoin(tx.categories);
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      categoryId: tx.category_id,
      categoryName: cat?.name ?? "Uncategorized",
      categoryIcon: cat?.icon ?? "circle",
      categoryColor: cat?.color ?? null,
    };
  });
}

// ────────────────────────────────────────────
// Fetch user categories for form selects
// ────────────────────────────────────────────

/**
 * Fetch all categories for the current user, ordered by group sort_order
 * then category sort_order. Includes group info for grouped display.
 */
export async function fetchUserCategories(): Promise<CategoryOption[]> {
  const supabase = await createClient();

  const { data: categories, error } = await supabase
    .from("categories")
    .select(
      "id, name, icon, color, type, group_id, sort_order, category_groups(name, sort_order)"
    )
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  // Parse the joined group data and sort by group.sort_order, then category.sort_order
  const parsed = (categories ?? []).map((cat) => {
    const group = cat.category_groups as
      | { name: string; sort_order: number }
      | null;
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      group_id: cat.group_id,
      group_name: group?.name ?? null,
      _group_sort: group?.sort_order ?? Infinity,
      _cat_sort: cat.sort_order,
    };
  });

  // Sort by group sort_order first, then category sort_order within each group
  parsed.sort((a, b) => {
    if (a._group_sort !== b._group_sort) return a._group_sort - b._group_sort;
    return a._cat_sort - b._cat_sort;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return parsed.map(({ _group_sort, _cat_sort, ...cat }) => cat);
}

// ────────────────────────────────────────────
// Fetch user currency
// ────────────────────────────────────────────

/**
 * Fetch the authenticated user's currency from their profile.
 */
export async function fetchTransactionPageCurrency(): Promise<string> {
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
