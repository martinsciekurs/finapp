"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatParseError } from "@/lib/utils/validation";
import {
  createDebtSchema,
  updateDebtSchema,
  createDebtPaymentSchema,
  updateDebtPaymentSchema,
  deleteDebtSchema,
  deleteDebtPaymentSchema,
  type CreateDebtValues,
  type UpdateDebtValues,
  type CreateDebtPaymentValues,
  type UpdateDebtPaymentValues,
  type DeleteDebtValues,
  type DeleteDebtPaymentValues,
} from "@/lib/validations/debt";
import type { ActionResult } from "@/lib/types/actions";
import type { Database, TablesInsert } from "@/lib/supabase/database.types";

function revalidate(): void {
  revalidatePath("/dashboard/debts");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard");
}

async function requireAuth(): Promise<{
  supabase: SupabaseClient<Database>;
  userId: string;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return { supabase, userId: user.id };
}

async function verifyDebtCategory(
  supabase: SupabaseClient<Database>,
  userId: string,
  categoryId: string,
  debtType: "i_owe" | "they_owe"
): Promise<{ valid: boolean; error?: string }> {
  const { data: category, error } = await supabase
    .from("categories")
    .select("id, type")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !category) {
    return { valid: false, error: "Category not found" };
  }

  const expectedType = debtType === "i_owe" ? "expense" : "income";
  if (category.type !== expectedType) {
    return {
      valid: false,
      error: `Debt type ${debtType} requires a ${expectedType} category`,
    };
  }

  return { valid: true };
}

function getRpcErrorMessage(
  error: { message?: string | null } | null,
  fallback: string
): string {
  return error?.message?.trim() || fallback;
}

function isDebtPaymentRpcResult(
  value: unknown
): value is { payment_id: string; transaction_id: string | null } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as {
    payment_id?: unknown;
    transaction_id?: unknown;
  };

  return (
    typeof payload.payment_id === "string" &&
    (typeof payload.transaction_id === "string" || payload.transaction_id === null)
  );
}

export async function createDebt(
  values: CreateDebtValues
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = createDebtSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid debt data"),
    };
  }

  const categoryCheck = await verifyDebtCategory(
    supabase,
    userId,
    parsed.data.category_id,
    parsed.data.type
  );

  if (!categoryCheck.valid) {
    return { success: false, error: categoryCheck.error };
  }

  const insertPayload: TablesInsert<"debts"> = {
    user_id: userId,
    counterparty: parsed.data.counterparty,
    type: parsed.data.type,
    category_id: parsed.data.category_id,
    debt_date: parsed.data.debt_date,
    original_amount: parsed.data.original_amount,
    remaining_amount: parsed.data.original_amount,
    description: parsed.data.description || null,
  };

  const { data, error } = await supabase
    .from("debts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to create debt" };
  }

  revalidate();
  return { success: true, data: { id: data.id } };
}

export async function updateDebt(
  values: UpdateDebtValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = updateDebtSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid debt data"),
    };
  }

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("id, original_amount, remaining_amount, type, category_id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (debtError) {
    return { success: false, error: "Failed to load debt" };
  }
  if (!debt) {
    return { success: false, error: "Debt not found" };
  }

  const effectiveCategoryId = parsed.data.category_id || debt.category_id;

  if (effectiveCategoryId) {
    const categoryCheck = await verifyDebtCategory(
      supabase,
      userId,
      effectiveCategoryId,
      parsed.data.type
    );

    if (!categoryCheck.valid) {
      return { success: false, error: categoryCheck.error };
    }
  }

  const { error: updateError } = await supabase.rpc("update_debt_atomic", {
    p_debt_id: parsed.data.id,
    p_counterparty: parsed.data.counterparty,
    p_type: parsed.data.type,
    p_category_id: parsed.data.category_id ? parsed.data.category_id : null,
    p_debt_date: parsed.data.debt_date,
    p_original_amount: parsed.data.original_amount,
    p_description: parsed.data.description || null,
  });

  if (updateError) {
    return {
      success: false,
      error: getRpcErrorMessage(updateError, "Failed to update debt"),
    };
  }

  revalidate();
  return { success: true };
}

export async function deleteDebt(values: DeleteDebtValues): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = deleteDebtSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid debt ID"),
    };
  }

  const { data: deleted, error } = await supabase
    .from("debts")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete debt" };
  }
  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Debt not found" };
  }

  revalidate();
  return { success: true };
}

export async function recordDebtPayment(
  values: CreateDebtPaymentValues
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase } = auth;

  const parsed = createDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment data"),
    };
  }

  const { data, error } = await supabase.rpc("record_debt_payment_atomic", {
    p_debt_id: parsed.data.debt_id,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
    p_payment_date: parsed.data.payment_date,
  });

  if (error) {
    return {
      success: false,
      error: getRpcErrorMessage(error, "Failed to record debt payment"),
    };
  }

  if (!isDebtPaymentRpcResult(data)) {
    return { success: false, error: "Failed to record debt payment" };
  }

  revalidate();
  return { success: true, data: { id: data.payment_id } };
}

export async function updateDebtPayment(
  values: UpdateDebtPaymentValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase } = auth;

  const parsed = updateDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment data"),
    };
  }

  const { error } = await supabase.rpc("update_debt_payment_atomic", {
    p_payment_id: parsed.data.id,
    p_amount: parsed.data.amount,
    p_note: parsed.data.note || null,
    p_payment_date: parsed.data.payment_date,
  });

  if (error) {
    return {
      success: false,
      error: getRpcErrorMessage(error, "Failed to update payment"),
    };
  }

  revalidate();
  return { success: true };
}

export async function deleteDebtPayment(
  values: DeleteDebtPaymentValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase } = auth;

  const parsed = deleteDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment ID"),
    };
  }

  const { error } = await supabase.rpc("delete_debt_payment_atomic", {
    p_payment_id: parsed.data.id,
  });

  if (error) {
    return {
      success: false,
      error: getRpcErrorMessage(error, "Failed to delete payment"),
    };
  }

  revalidate();
  return { success: true };
}
