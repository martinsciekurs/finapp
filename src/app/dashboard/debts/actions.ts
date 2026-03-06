"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { formatDateForInput } from "@/lib/utils/date";
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
import type { Database, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";

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

function debtTransactionDescription(
  debtType: "i_owe" | "they_owe",
  counterparty: string,
  note?: string
): string {
  const base =
    debtType === "i_owe"
      ? `Payment to ${counterparty}`
      : `Repayment from ${counterparty}`;
  return note ? `${base} — ${note}` : base;
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

  if (parsed.data.category_id) {
    const categoryCheck = await verifyDebtCategory(
      supabase,
      userId,
      parsed.data.category_id,
      parsed.data.type
    );

    if (!categoryCheck.valid) {
      return { success: false, error: categoryCheck.error };
    }
  }

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("id, original_amount, remaining_amount, type")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (debtError) {
    return { success: false, error: "Failed to load debt" };
  }
  if (!debt) {
    return { success: false, error: "Debt not found" };
  }

  const { count: paymentsCount, error: paymentsCountError } = await supabase
    .from("debt_payments")
    .select("id", { count: "exact", head: true })
    .eq("debt_id", parsed.data.id)
    .eq("user_id", userId);

  if (paymentsCountError) {
    return { success: false, error: "Failed to validate debt updates" };
  }

  if ((paymentsCount ?? 0) > 0 && parsed.data.type !== debt.type) {
    return {
      success: false,
      error: "Cannot change debt direction after payments have been logged",
    };
  }

  const paidAmount = debt.original_amount - debt.remaining_amount;
  if (parsed.data.original_amount < paidAmount) {
    return {
      success: false,
      error: "Original amount cannot be below already paid amount",
    };
  }

  const updatePayload: TablesUpdate<"debts"> = {
    counterparty: parsed.data.counterparty,
    type: parsed.data.type,
    category_id: parsed.data.category_id || null,
    debt_date: parsed.data.debt_date,
    original_amount: parsed.data.original_amount,
    remaining_amount: parsed.data.original_amount - paidAmount,
    description: parsed.data.description || null,
  };

  const { data: updated, error: updateError } = await supabase
    .from("debts")
    .update(updatePayload)
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (updateError) {
    return { success: false, error: "Failed to update debt" };
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: "Debt not found" };
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
  const { supabase, userId } = auth;

  const parsed = createDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment data"),
    };
  }

  const { data: debt, error: debtError } = await supabase
    .from("debts")
    .select("id, counterparty, type, remaining_amount, category_id")
    .eq("id", parsed.data.debt_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (debtError) {
    return { success: false, error: "Failed to fetch debt" };
  }
  if (!debt) {
    return { success: false, error: "Debt not found" };
  }

  if (parsed.data.amount > debt.remaining_amount) {
    return { success: false, error: "Payment exceeds remaining amount" };
  }

  if (!debt.category_id) {
    return {
      success: false,
      error: "Debt has no category. Edit debt and choose a category first.",
    };
  }

  const txType = debt.type === "i_owe" ? "expense" : "income";

  const categoryCheck = await verifyDebtCategory(
    supabase,
    userId,
    debt.category_id,
    debt.type
  );

  if (!categoryCheck.valid) {
    return {
      success: false,
      error: categoryCheck.error ?? "Debt category is invalid",
    };
  }

  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      category_id: debt.category_id,
      amount: parsed.data.amount,
      type: txType,
      description: debtTransactionDescription(debt.type, debt.counterparty, parsed.data.note || undefined),
      date: parsed.data.payment_date,
      source: "web",
      ai_generated: false,
    })
    .select("id")
    .single();

  if (txError) {
    return { success: false, error: "Failed to create linked transaction" };
  }

  const { data: payment, error: paymentError } = await supabase
    .from("debt_payments")
    .insert({
      debt_id: parsed.data.debt_id,
      user_id: userId,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      transaction_id: transaction.id,
    })
    .select("id")
    .single();

  if (paymentError) {
    const { error: rollbackError } = await supabase
      .from("transactions")
      .delete()
      .eq("id", transaction.id)
      .eq("user_id", userId);

    if (rollbackError) {
      console.error("Failed to rollback linked transaction", {
        transactionId: transaction.id,
        error: rollbackError.message,
      });
      return {
        success: false,
        error: "Failed to record payment and rollback failed. Please contact support.",
      };
    }

    if (paymentError.message.includes("remaining_amount negative")) {
      return { success: false, error: "Payment exceeds remaining amount" };
    }

    return { success: false, error: "Failed to record debt payment" };
  }

  revalidate();
  return { success: true, data: { id: payment.id } };
}

export async function updateDebtPayment(
  values: UpdateDebtPaymentValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = updateDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment data"),
    };
  }

  const { data: payment, error: paymentFetchError } = await supabase
    .from("debt_payments")
    .select("id, debt_id, amount, note, transaction_id")
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .maybeSingle();

  if (paymentFetchError) {
    return { success: false, error: "Failed to load payment" };
  }
  if (!payment) {
    return { success: false, error: "Payment not found" };
  }

  const { data: debt, error: debtFetchError } = await supabase
    .from("debts")
    .select("remaining_amount, counterparty, type")
    .eq("id", payment.debt_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (debtFetchError || !debt) {
    return { success: false, error: "Failed to validate payment update" };
  }

  const maxAllowed = debt.remaining_amount + payment.amount;
  if (parsed.data.amount > maxAllowed) {
    return { success: false, error: "Payment exceeds remaining amount" };
  }

  const oldAmount = payment.amount;
  const oldNote = payment.note;

  const { data: updated, error: updateError } = await supabase
    .from("debt_payments")
    .update({
      amount: parsed.data.amount,
      note: parsed.data.note || null,
    })
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (updateError) {
    if (updateError.message.includes("remaining_amount negative")) {
      return { success: false, error: "Payment exceeds remaining amount" };
    }
    return { success: false, error: "Failed to update payment" };
  }
  if (!updated || updated.length === 0) {
    return { success: false, error: "Payment not found" };
  }

  if (payment.transaction_id) {
    const { error: txUpdateError } = await supabase
      .from("transactions")
      .update({
        amount: parsed.data.amount,
        date: parsed.data.payment_date,
        description: debtTransactionDescription(debt.type, debt.counterparty, parsed.data.note || undefined),
      })
      .eq("id", payment.transaction_id)
      .eq("user_id", userId);

    if (txUpdateError) {
      const { error: rollbackError } = await supabase
        .from("debt_payments")
        .update({ amount: oldAmount, note: oldNote })
        .eq("id", parsed.data.id)
        .eq("user_id", userId);

      if (rollbackError) {
        console.error("Failed to rollback debt payment after transaction update error", {
          paymentId: parsed.data.id,
          error: rollbackError.message,
        });
        return {
          success: false,
          error: "Payment updated but transaction sync failed and rollback failed. Please contact support.",
        };
      }

      return { success: false, error: "Failed to update linked transaction" };
    }
  }

  revalidate();
  return { success: true };
}

export async function deleteDebtPayment(
  values: DeleteDebtPaymentValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = deleteDebtPaymentSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: formatParseError(parsed.error, "Invalid payment ID"),
    };
  }

  const { data: deleted, error } = await supabase
    .from("debt_payments")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete payment" };
  }
  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Payment not found" };
  }

  revalidate();
  return { success: true };
}
