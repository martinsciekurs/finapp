"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  createGroupSchema,
  updateGroupSchema,
  deleteGroupSchema,
  reorderCategoriesSchema,
  reorderGroupsSchema,
  type CreateCategoryValues,
  type UpdateCategoryValues,
  type DeleteCategoryValues,
  type CreateGroupValues,
  type UpdateGroupValues,
  type DeleteGroupValues,
  type ReorderCategoriesValues,
  type ReorderGroupsValues,
} from "@/lib/validations/category";
import type { ActionResult } from "@/lib/types/actions";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

const CATEGORIES_PATH = "/dashboard/settings/categories";

function revalidate() {
  revalidatePath(CATEGORIES_PATH);
  // Also revalidate transaction pages since they display category info
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
}

// ────────────────────────────────────────────
// Create category
// ────────────────────────────────────────────

export async function createCategory(
  values: CreateCategoryValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createCategorySchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid category data",
    };
  }

  // Verify the group belongs to the user and matches the type
  const { data: group, error: groupError } = await supabase
    .from("category_groups")
    .select("id, type")
    .eq("id", parsed.data.group_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (groupError || !group) {
    return { success: false, error: "Invalid group" };
  }

  if (group.type !== parsed.data.type) {
    return {
      success: false,
      error: "Category type must match group type",
    };
  }

  // Get next sort_order for this group
  const { data: lastCat } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("group_id", parsed.data.group_id)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastCat?.sort_order ?? -1) + 1;

  const { data: category, error } = await supabase
    .from("categories")
    .insert({
      user_id: user.id,
      group_id: parsed.data.group_id,
      name: parsed.data.name,
      type: parsed.data.type,
      icon: parsed.data.icon,
      color: parsed.data.color,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" };
    }
    return { success: false, error: "Failed to create category" };
  }

  revalidate();
  return { success: true, data: { id: category.id } };
}

// ────────────────────────────────────────────
// Update category
// ────────────────────────────────────────────

export async function updateCategory(
  id: string,
  values: UpdateCategoryValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!id) {
    return { success: false, error: "Invalid category ID" };
  }

  const parsed = updateCategorySchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid update data",
    };
  }

  // If group_id is being updated, verify the new group belongs to user and type matches
  if (parsed.data.group_id) {
    const { data: currentCat } = await supabase
      .from("categories")
      .select("type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!currentCat) {
      return { success: false, error: "Category not found" };
    }

    const { data: group, error: groupError } = await supabase
      .from("category_groups")
      .select("id, type")
      .eq("id", parsed.data.group_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (groupError || !group) {
      return { success: false, error: "Invalid group" };
    }

    if (group.type !== currentCat.type) {
      return {
        success: false,
        error: "Cannot move category to a group of different type",
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("categories")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A category with this name already exists" };
    }
    return { success: false, error: "Failed to update category" };
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: "Category not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Delete category
// ────────────────────────────────────────────

export async function deleteCategory(
  values: DeleteCategoryValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = deleteCategorySchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid delete data",
    };
  }

  // Reject self-reassign
  if (parsed.data.reassign_to && parsed.data.reassign_to === parsed.data.id) {
    return { success: false, error: "Cannot reassign to the same category" };
  }

  // Check if the category has transactions
  const { count, error: countError } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", parsed.data.id)
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: "Failed to check transactions" };
  }

  if ((count ?? 0) > 0) {
    if (!parsed.data.reassign_to) {
      return {
        success: false,
        error: "Category has transactions. Provide a reassign target.",
      };
    }

    // Verify reassign target belongs to user and same type
    const { data: sourceCat } = await supabase
      .from("categories")
      .select("type")
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .single();

    const { data: targetCat } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", parsed.data.reassign_to)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!targetCat) {
      return { success: false, error: "Invalid reassign target" };
    }

    if (sourceCat && targetCat.type !== sourceCat.type) {
      return {
        success: false,
        error: "Reassign target must be the same type",
      };
    }

    // Reassign transactions
    const { error: reassignError } = await supabase
      .from("transactions")
      .update({ category_id: parsed.data.reassign_to })
      .eq("category_id", parsed.data.id)
      .eq("user_id", user.id);

    if (reassignError) {
      return { success: false, error: "Failed to reassign transactions" };
    }
  }

  // Delete the category
  const { data: deleted, error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete category" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Category not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Create group
// ────────────────────────────────────────────

export async function createGroup(
  values: CreateGroupValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createGroupSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid group data",
    };
  }

  // Get next sort_order
  const { data: lastGroup } = await supabase
    .from("category_groups")
    .select("sort_order")
    .eq("type", parsed.data.type)
    .eq("user_id", user.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder = (lastGroup?.sort_order ?? -1) + 1;

  const { data: group, error } = await supabase
    .from("category_groups")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      type: parsed.data.type,
      sort_order: nextSortOrder,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A group with this name already exists" };
    }
    return { success: false, error: "Failed to create group" };
  }

  revalidate();
  return { success: true, data: { id: group.id } };
}

// ────────────────────────────────────────────
// Update group
// ────────────────────────────────────────────

export async function updateGroup(
  id: string,
  values: UpdateGroupValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!id) {
    return { success: false, error: "Invalid group ID" };
  }

  const parsed = updateGroupSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid update data",
    };
  }

  const { data: updated, error } = await supabase
    .from("category_groups")
    .update({ name: parsed.data.name })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A group with this name already exists" };
    }
    return { success: false, error: "Failed to update group" };
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: "Group not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Delete group
// ────────────────────────────────────────────

export async function deleteGroup(
  values: DeleteGroupValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = deleteGroupSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid delete data",
    };
  }

  // Check if group has categories
  const { count, error: countError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("group_id", parsed.data.id)
    .eq("user_id", user.id);

  if (countError) {
    return { success: false, error: "Failed to check categories" };
  }

  if ((count ?? 0) > 0) {
    if (!parsed.data.reassign_to) {
      return {
        success: false,
        error: "Group has categories. Provide a reassign target.",
      };
    }

    // Verify reassign target belongs to user and same type
    const { data: sourceGroup } = await supabase
      .from("category_groups")
      .select("type")
      .eq("id", parsed.data.id)
      .eq("user_id", user.id)
      .single();

    const { data: targetGroup } = await supabase
      .from("category_groups")
      .select("id, type")
      .eq("id", parsed.data.reassign_to)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!targetGroup) {
      return { success: false, error: "Invalid reassign target" };
    }

    if (sourceGroup && targetGroup.type !== sourceGroup.type) {
      return {
        success: false,
        error: "Reassign target must be the same type",
      };
    }

    // Reassign categories
    const { error: reassignError } = await supabase
      .from("categories")
      .update({ group_id: parsed.data.reassign_to })
      .eq("group_id", parsed.data.id)
      .eq("user_id", user.id);

    if (reassignError) {
      return { success: false, error: "Failed to reassign categories" };
    }
  }

  // Delete the group
  const { data: deleted, error } = await supabase
    .from("category_groups")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete group" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Group not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Reorder categories
// ────────────────────────────────────────────

export async function reorderCategories(
  values: ReorderCategoriesValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = reorderCategoriesSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid reorder data",
    };
  }

  // Update each category's sort_order
  for (const item of parsed.data.items) {
    const { error } = await supabase
      .from("categories")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to reorder categories" };
    }
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Reorder groups
// ────────────────────────────────────────────

export async function reorderGroups(
  values: ReorderGroupsValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = reorderGroupsSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid reorder data",
    };
  }

  for (const item of parsed.data.items) {
    const { error } = await supabase
      .from("category_groups")
      .update({ sort_order: item.sort_order })
      .eq("id", item.id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: "Failed to reorder groups" };
    }
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Get category transaction count (for delete dialog)
// ────────────────────────────────────────────

export async function getCategoryTransactionCount(
  categoryId: string
): Promise<ActionResult<{ count: number }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { count, error } = await supabase
    .from("transactions")
    .select("id", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Failed to count transactions" };
  }

  return { success: true, data: { count: count ?? 0 } };
}


