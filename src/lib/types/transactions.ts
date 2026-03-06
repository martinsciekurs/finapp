/**
 * Shared types for the full transactions page.
 *
 * Separate from `dashboard.ts` because the transactions page
 * needs richer data (category_id for editing, full description, etc.)
 */

import type { AttachmentData } from "@/lib/types/attachments";

// ────────────────────────────────────────────
// Transaction display data
// ────────────────────────────────────────────

export interface TransactionData {
  id: string;
  amount: number;
  type: "expense" | "income";
  description: string;
  date: string;
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string | null;
  attachments: AttachmentData[];
}

// ────────────────────────────────────────────
// Category option (for form selects)
// ────────────────────────────────────────────

export interface CategoryOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  group_id: string | null;
  group_name: string | null;
}

// ────────────────────────────────────────────
// Filter state
// ────────────────────────────────────────────

export type TransactionTypeFilter = "all" | "expense" | "income";
