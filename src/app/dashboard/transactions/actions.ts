"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionValues,
  type UpdateTransactionValues,
} from "@/lib/validations/transaction";
import type { ActionResult } from "@/lib/types/actions";

// ────────────────────────────────────────────
// Create transaction
// ────────────────────────────────────────────

export async function createTransaction(
  values: CreateTransactionValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Validate input
  const parsed = createTransactionSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid transaction data",
    };
  }

  // Verify the category belongs to the user and matches the type
  const { data: category, error: catError } = await supabase
    .from("categories")
    .select("id, type")
    .eq("id", parsed.data.category_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (catError || !category) {
    return { success: false, error: "Invalid category" };
  }

  if (category.type !== parsed.data.type) {
    return {
      success: false,
      error: `Category type mismatch: expected ${parsed.data.type}, got ${category.type}`,
    };
  }

  // Insert the transaction
  const { data: transaction, error } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      category_id: parsed.data.category_id,
      amount: parsed.data.amount,
      type: parsed.data.type,
      description: parsed.data.description ?? "",
      date: parsed.data.date,
      source: parsed.data.source,
      ai_generated: parsed.data.ai_generated,
    })
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to create transaction" };
  }

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");

  return { success: true, data: { id: transaction.id } };
}

// ────────────────────────────────────────────
// Update transaction
// ────────────────────────────────────────────

export async function updateTransaction(
  id: string,
  values: UpdateTransactionValues
): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid transaction ID" };
  }

  // Validate input
  const parsed = updateTransactionSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid update data",
    };
  }

  // If category_id or type is being updated, verify the combination
  if (parsed.data.category_id || parsed.data.type) {
    // We need to know the full state — fetch current transaction
    const { data: current, error: fetchError } = await supabase
      .from("transactions")
      .select("category_id, type")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !current) {
      return { success: false, error: "Transaction not found" };
    }

    const categoryId = parsed.data.category_id ?? current.category_id;
    const type = parsed.data.type ?? current.type;

    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id, type")
      .eq("id", categoryId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (catError || !category) {
      return { success: false, error: "Invalid category" };
    }

    if (category.type !== type) {
      return {
        success: false,
        error: `Category type mismatch: expected ${type}, got ${category.type}`,
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("transactions")
    .update(parsed.data)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to update transaction" };
  }

  if (!updated || updated.length === 0) {
    return { success: false, error: "Transaction not found" };
  }

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}

// ────────────────────────────────────────────
// Delete transaction
// ────────────────────────────────────────────

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  if (!id || typeof id !== "string") {
    return { success: false, error: "Invalid transaction ID" };
  }

  const { data: deleted, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete transaction" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Transaction not found" };
  }

  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");

  return { success: true };
}
