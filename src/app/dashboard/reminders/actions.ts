"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { formatDateForInput } from "@/lib/utils/date";
import { isValidOccurrence } from "@/lib/utils/recurrence";
import { formatParseError } from "@/lib/utils/validation";
import {
  createReminderSchema,
  updateReminderSchema,
  deleteReminderSchema,
  markOccurrencePaidSchema,
  markOccurrenceUnpaidSchema,
  type CreateReminderValues,
  type UpdateReminderValues,
  type DeleteReminderValues,
  type MarkOccurrencePaidValues,
  type MarkOccurrenceUnpaidValues,
} from "@/lib/validations/reminder";
import type { ActionResult } from "@/lib/types/actions";
import type { Database, TablesInsert, TablesUpdate } from "@/lib/supabase/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function revalidate(): void {
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard");
}

const uuidSchema = z.string().uuid("Invalid ID");

/** Shared auth guard — returns authenticated Supabase client + user ID, or null. */
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

/**
 * Verify a category belongs to the given user and is an expense category.
 * Returns `{ valid: true }` if the category exists and belongs to the user,
 * `{ valid: false }` if it doesn't exist, or `{ valid: false, error }` on
 * query failure so callers can distinguish "not found" from a real DB error.
 */
async function verifyCategoryOwnership(
  supabase: SupabaseClient<Database>,
  categoryId: string,
  userId: string
): Promise<{ valid: boolean; error?: string }> {
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .eq("type", "expense")
    .maybeSingle();

  if (error) {
    return { valid: false, error: "Failed to verify category" };
  }

  return { valid: !!data };
}

// ────────────────────────────────────────────
// Create reminder
// ────────────────────────────────────────────

export async function createReminder(
  values: CreateReminderValues
): Promise<ActionResult<{ id: string }>> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = createReminderSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: formatParseError(parsed.error, "Invalid reminder data") };
  }

  const catCheck = await verifyCategoryOwnership(supabase, parsed.data.category_id, userId);
  if (!catCheck.valid) return { success: false, error: catCheck.error ?? "Category not found" };

  const insertPayload: TablesInsert<"reminders"> = {
    user_id: userId,
    ...parsed.data,
  };

  const { data, error } = await supabase
    .from("reminders")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) {
    return { success: false, error: "Failed to create reminder" };
  }

  revalidate();
  return { success: true, data: { id: data.id } };
}

// ────────────────────────────────────────────
// Update reminder
// ────────────────────────────────────────────

export async function updateReminder(
  id: string,
  values: UpdateReminderValues
): Promise<ActionResult> {
  if (!uuidSchema.safeParse(id).success) {
    return { success: false, error: "Invalid reminder ID" };
  }

  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = updateReminderSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: formatParseError(parsed.error, "Invalid reminder data") };
  }

  const catCheck = await verifyCategoryOwnership(supabase, parsed.data.category_id, userId);
  if (!catCheck.valid) return { success: false, error: catCheck.error ?? "Category not found" };

  const updatePayload: TablesUpdate<"reminders"> = { ...parsed.data };

  const { data: updated, error } = await supabase
    .from("reminders")
    .update(updatePayload)
    .eq("id", id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to update reminder" };
  }

  if (updated.length === 0) {
    return { success: false, error: "Reminder not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Delete reminder
// ────────────────────────────────────────────

export async function deleteReminder(
  values: DeleteReminderValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = deleteReminderSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: formatParseError(parsed.error, "Invalid data") };
  }

  const { data: deleted, error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete reminder" };
  }

  if (deleted.length === 0) {
    return { success: false, error: "Reminder not found" };
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Mark occurrence as paid (per-period)
// ────────────────────────────────────────────

/**
 * Mark a specific occurrence of a reminder as paid.
 * Creates a payment record and optionally an expense transaction.
 */
export async function markOccurrencePaid(
  values: MarkOccurrencePaidValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = markOccurrencePaidSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: formatParseError(parsed.error, "Invalid data") };
  }

  // Fetch the reminder template
  const { data: reminder, error: fetchError } = await supabase
    .from("reminders")
    .select(
      "id, title, amount, due_date, frequency, category_id, auto_create_transaction"
    )
    .eq("id", parsed.data.reminder_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: "Failed to fetch reminder" };
  }
  if (!reminder) {
    return { success: false, error: "Reminder not found" };
  }

  // Validate that the due_date is a valid occurrence for this reminder's
  // recurrence schedule — prevents off-schedule payments.
  if (
    !isValidOccurrence(
      reminder.due_date,
      reminder.frequency,
      parsed.data.due_date
    )
  ) {
    return { success: false, error: "Invalid due_date for this reminder" };
  }

  // Reserve the payment record first — the unique constraint on
  // (reminder_id, due_date) prevents races / double-pay atomically.
  const { data: reserved, error: reserveError } = await supabase
    .from("reminder_payments")
    .insert({
      reminder_id: parsed.data.reminder_id,
      user_id: userId,
      due_date: parsed.data.due_date,
      transaction_id: null,
    })
    .select("id")
    .single();

  if (reserveError) {
    // 23505 = unique_violation → already paid
    if (reserveError.code === "23505") {
      return { success: false, error: "This occurrence is already paid" };
    }
    return { success: false, error: "Failed to record payment" };
  }

  if (reminder.auto_create_transaction) {
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        category_id: reminder.category_id,
        amount: reminder.amount,
        type: "expense",
        description: reminder.title,
        date: formatDateForInput(new Date()),
        source: "web",
      })
      .select("id")
      .single();

    if (txError) {
      // Roll back the reserved payment to avoid an orphaned record
      const { error: rbError } = await supabase
        .from("reminder_payments")
        .delete()
        .eq("id", reserved.id)
        .eq("user_id", userId);
      if (rbError) {
        console.error("Rollback failed: could not delete reserved payment", {
          paymentId: reserved.id,
          error: rbError.message,
        });
        return {
          success: false,
          error: "Failed to create transaction and rollback failed. Please contact support.",
        };
      }
      return { success: false, error: "Failed to create transaction" };
    }

    // Link the transaction to the payment record
    const { data: linkedRow, error: linkError } = await supabase
      .from("reminder_payments")
      .update({ transaction_id: tx.id })
      .eq("id", reserved.id)
      .select("id")
      .maybeSingle();

    if (linkError || !linkedRow) {
      // Roll back: delete the orphaned transaction and reserved payment
      const rollbackErrors: string[] = [];

      const { error: rbTxErr } = await supabase
        .from("transactions")
        .delete()
        .eq("id", tx.id)
        .eq("user_id", userId);
      if (rbTxErr) {
        console.error("Rollback failed: could not delete transaction", {
          transactionId: tx.id,
          error: rbTxErr.message,
        });
        rollbackErrors.push(
          `delete transactions (id: ${tx.id}): ${rbTxErr.message}`
        );
      }

      const { error: rbPayErr } = await supabase
        .from("reminder_payments")
        .delete()
        .eq("id", reserved.id)
        .eq("user_id", userId);
      if (rbPayErr) {
        console.error("Rollback failed: could not delete reserved payment", {
          paymentId: reserved.id,
          error: rbPayErr.message,
        });
        rollbackErrors.push(
          `delete reminder_payments (id: ${reserved.id}): ${rbPayErr.message}`
        );
      }

      if (rollbackErrors.length > 0) {
        return {
          success: false,
          error: "Failed to link transaction to payment and rollback failed. Please contact support.",
        };
      }
      return { success: false, error: "Failed to link transaction to payment" };
    }
  }

  revalidate();
  return { success: true };
}

// ────────────────────────────────────────────
// Mark occurrence as unpaid (undo)
// ────────────────────────────────────────────

/**
 * Remove a payment record for a specific occurrence.
 * Does NOT delete the linked transaction (user must do that manually
 * if needed, to avoid data loss).
 */
export async function markOccurrenceUnpaid(
  values: MarkOccurrenceUnpaidValues
): Promise<ActionResult> {
  const auth = await requireAuth();
  if (!auth) return { success: false, error: "Not authenticated" };
  const { supabase, userId } = auth;

  const parsed = markOccurrenceUnpaidSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: formatParseError(parsed.error, "Invalid data") };
  }

  const { data: deleted, error } = await supabase
    .from("reminder_payments")
    .delete()
    .eq("reminder_id", parsed.data.reminder_id)
    .eq("due_date", parsed.data.due_date)
    .eq("user_id", userId)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to remove payment" };
  }

  if (deleted.length === 0) {
    return { success: false, error: "Payment record not found" };
  }

  revalidate();
  return { success: true };
}
