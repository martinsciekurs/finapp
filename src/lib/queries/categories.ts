import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { CategoryGroupData, CategoryData } from "@/lib/types/categories";

// ────────────────────────────────────────────
// Fetch categories grouped by category_group
// ────────────────────────────────────────────

/**
 * Fetch all category groups of a given type with their nested categories.
 * Both groups and categories are ordered by sort_order.
 */
export async function fetchCategoriesWithGroups(
  type: "expense" | "income"
): Promise<CategoryGroupData[]> {
  const supabase = await createClient();

  // Fetch groups
  const { data: groups, error: groupError } = await supabase
    .from("category_groups")
    .select("id, name, type, sort_order")
    .eq("type", type)
    .order("sort_order", { ascending: true });

  if (groupError) {
    throw new Error(
      `Failed to fetch category groups: ${groupError.message}`
    );
  }

  // Fetch categories for this type
  const { data: categories, error: catError } = await supabase
    .from("categories")
    .select("id, name, icon, color, type, group_id, sort_order")
    .eq("type", type)
    .order("sort_order", { ascending: true });

  if (catError) {
    throw new Error(`Failed to fetch categories: ${catError.message}`);
  }

  // Build a map of group_id -> categories
  const categoryMap = new Map<string, CategoryData[]>();
  for (const cat of categories ?? []) {
    const list = categoryMap.get(cat.group_id) ?? [];
    list.push({
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type,
      group_id: cat.group_id,
      sort_order: cat.sort_order,
    });
    categoryMap.set(cat.group_id, list);
  }

  return (groups ?? []).map((group) => ({
    id: group.id,
    name: group.name,
    type: group.type,
    sort_order: group.sort_order,
    categories: categoryMap.get(group.id) ?? [],
  }));
}

