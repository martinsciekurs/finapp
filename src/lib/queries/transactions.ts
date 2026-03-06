import "server-only";

import { createClient } from "@/lib/supabase/server";
import { fetchAttachmentsByRecordIds } from "@/lib/queries/attachments";
import { getTransactionCategoryDisplay } from "@/lib/utils/transactions";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";
import type { TagData } from "@/lib/types/tags";

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

  const transactionIds = (rows ?? []).map((row) => row.id);

  const attachmentsByRecord = await fetchAttachmentsByRecordIds(
    "transaction",
    transactionIds
  );

  // Batch-load tags for all transactions
  const { data: tagRows } = await supabase
    .from("transaction_tags")
    .select("transaction_id, tags(id, name, color)")
    .in("transaction_id", transactionIds);

  const tagsByTransaction = new Map<string, TagData[]>();
  for (const row of tagRows ?? []) {
    const tag = row.tags as unknown as {
      id: string;
      name: string;
      color: string;
    } | null;
    if (!tag) continue;
    const existing = tagsByTransaction.get(row.transaction_id) ?? [];
    existing.push({ id: tag.id, name: tag.name, color: tag.color });
    tagsByTransaction.set(row.transaction_id, existing);
  }

  return (rows ?? []).map((tx) => {
    const categoryDisplay = getTransactionCategoryDisplay(tx.categories);
    return {
      id: tx.id,
      amount: tx.amount,
      type: tx.type as "expense" | "income",
      description: tx.description ?? "",
      date: tx.date,
      categoryId: tx.category_id,
      ...categoryDisplay,
      attachments: attachmentsByRecord.get(tx.id) ?? [],
      tags: tagsByTransaction.get(tx.id) ?? [],
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
        type: cat.type as "expense" | "income",
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

// ────────────────────────────────────────────
// Fetch user tags for tag management
// ────────────────────────────────────────────

export async function fetchUserTags(): Promise<TagData[]> {
  const supabase = await createClient();

  const { data: tags, error } = await supabase
    .from("tags")
    .select("id, name, color")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch tags: ${error.message}`);
  }

  return (tags ?? []).map((t) => ({ id: t.id, name: t.name, color: t.color }));
}
