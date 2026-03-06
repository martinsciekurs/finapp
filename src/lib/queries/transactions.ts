import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAttachmentsByRecordIds } from "@/lib/queries/attachments";
import { getTransactionCategoryDisplay } from "@/lib/utils/transactions";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";

interface CategoryGroupJoin {
  name: string;
  sort_order: number;
}

function parseCategoryGroupJoin(raw: unknown): CategoryGroupJoin | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const candidate = raw as Record<string, unknown>;
  if (
    typeof candidate.name === "string" &&
    typeof candidate.sort_order === "number"
  ) {
    return {
      name: candidate.name,
      sort_order: candidate.sort_order,
    };
  }

  return null;
}

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

  const attachmentsByRecord = await fetchAttachmentsByRecordIds(
    "transaction",
    (rows ?? []).map((row) => row.id)
  );

  return (rows ?? []).map((tx) => {
    const categoryDisplay = getTransactionCategoryDisplay(tx.categories);
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      date: tx.date,
      categoryId: tx.category_id,
      ...categoryDisplay,
      attachments: attachmentsByRecord.get(tx.id) ?? [],
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

  const parsed = (categories ?? []).map((cat) => {
    const group = parseCategoryGroupJoin(cat.category_groups);
    return {
      category: {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type,
        group_id: cat.group_id,
        group_name: group?.name ?? null,
      },
      groupSort: group?.sort_order ?? Infinity,
      categorySort: cat.sort_order,
    };
  });

  parsed.sort((a, b) => {
    if (a.groupSort !== b.groupSort) return a.groupSort - b.groupSort;
    return a.categorySort - b.categorySort;
  });

  return parsed.map((item) => item.category);
}
