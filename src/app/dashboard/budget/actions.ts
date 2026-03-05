"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  upsertCategoryBudgetSchema,
  removeCategoryBudgetSchema,
  bulkUpsertCategoryBudgetsSchema,
  upsertIncomeTargetSchema,
  removeIncomeTargetSchema,
  type UpsertCategoryBudgetValues,
  type RemoveCategoryBudgetValues,
  type BulkUpsertCategoryBudgetsValues,
  type UpsertIncomeTargetValues,
  type RemoveIncomeTargetValues,
} from "@/lib/validations/budget";
import type { ActionResult } from "@/lib/types/actions";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function revalidate() {
  revalidatePath("/dashboard/budget");
  revalidatePath("/dashboard");
}

// ────────────────────────────────────────────
// Upsert category budget
// ────────────────────────────────────────────

export async function upsertCategoryBudget(
  values: UpsertCategoryBudgetValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = upsertCategoryBudgetSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid budget data",
    };
  }

  // Verify the category belongs to the user
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id")
    .eq("id", parsed.data.categoryId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (catError || !category) {
    return { success: false, error: "Category not found" };
  }

  const { data, error } = await supabase
    .from("category_budgets")
    .upsert(
      {
        category_id: parsed.data.categoryId,
        user_id: user.id,
        year_month: parsed.data.yearMonth,
        amount: parsed.data.amount,
      },
      { onConflict: "category_id,year_month" }
    )
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to save budget" };
  }

  revalidate();
  return { success: true, data: { id: data.id } };
}

// ────────────────────────────────────────────
// Remove category budget
// ────────────────────────────────────────────

export async function removeCategoryBudget(
  values: RemoveCategoryBudgetValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = removeCategoryBudgetSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid data",
    };
  }

  const { data: deleted, error } = await supabase
    .from("category_budgets")
    .delete()
    .eq("category_id", parsed.data.categoryId)
    .eq("year_month", parsed.data.yearMonth)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to remove budget" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Budget not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Bulk upsert category budgets
// ────────────────────────────────────────────

export async function bulkUpsertCategoryBudgets(
  values: BulkUpsertCategoryBudgetsValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = bulkUpsertCategoryBudgetsSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid bulk budget data",
    };
  }

  // Verify all categories belong to the user
  const categoryIds = [...new Set(parsed.data.items.map((i) => i.categoryId))];
  const { data: cats, error: catError } = await supabase
    .from("categories")
    .select("id")
    .in("id", categoryIds)
    .eq("user_id", user.id);

  if (catError) {
    return { success: false, error: "Failed to verify categories" };
  }

  const ownedIds = new Set((cats ?? []).map((c) => c.id));
  const allOwned = categoryIds.every((id) => ownedIds.has(id));
  if (!allOwned) {
    return { success: false, error: "One or more categories not found" };
  }

  const rows = parsed.data.items.map((item) => ({
    category_id: item.categoryId,
    user_id: user.id,
    year_month: item.yearMonth,
    amount: item.amount,
  }));

  const { error } = await supabase
    .from("category_budgets")
    .upsert(rows, { onConflict: "category_id,year_month" });

  if (error) {
    return { success: false, error: "Failed to save budgets" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Upsert income target
// ────────────────────────────────────────────

export async function upsertIncomeTarget(
  values: UpsertIncomeTargetValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = upsertIncomeTargetSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid income target data",
    };
  }

  const { data, error } = await supabase
    .from("monthly_income_targets")
    .upsert(
      {
        user_id: user.id,
        year_month: parsed.data.yearMonth,
        amount: parsed.data.amount,
      },
      { onConflict: "user_id,year_month" }
    )
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to save income target" };
  }

  revalidate();
  return { success: true, data: { id: data.id } };
}

// ────────────────────────────────────────────
// Remove income target
// ────────────────────────────────────────────

export async function removeIncomeTarget(
  values: RemoveIncomeTargetValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = removeIncomeTargetSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid data",
    };
  }

  const { data: deleted, error } = await supabase
    .from("monthly_income_targets")
    .delete()
    .eq("year_month", parsed.data.yearMonth)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to remove income target" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Income target not found" };
  }

  revalidate();
  return { success: true };
}
