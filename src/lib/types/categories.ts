/**
 * Shared types for the Settings > Categories page.
 */

// ────────────────────────────────────────────
// Category with group relationship
// ────────────────────────────────────────────

export interface CategoryData {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "expense" | "income";
  group_id: string;
  sort_order: number;
}

// ────────────────────────────────────────────
// Group with nested categories
// ────────────────────────────────────────────

export interface CategoryGroupData {
  id: string;
  name: string;
  type: "expense" | "income";
  sort_order: number;
  categories: CategoryData[];
}
