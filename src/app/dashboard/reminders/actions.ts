"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { formatDateForInput } from "@/lib/utils/date";
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

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function revalidate() {
  revalidatePath("/dashboard/reminders");
  revalidatePath("/dashboard");
}

// ────────────────────────────────────────────
// Create reminder
// ────────────────────────────────────────────

export async function createReminder(
  values: CreateReminderValues
): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = createReminderSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid reminder data",
    };
  }

  // Verify category belongs to the user and is an expense category
  if (parsed.data.category_id) {
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parsed.data.category_id)
      .eq("user_id", user.id)
      .eq("type", "expense")
      .maybeSingle();

    if (catError || !category) {
      return { success: false, error: "Category not found" };
    }
  }

  // category_id is nullable in the DB but the generated types mark it as
  // required string. Use a type assertion for the insert payload.
  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    title: parsed.data.title,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    frequency: parsed.data.frequency,
    category_id: parsed.data.category_id ?? null,
    auto_create_transaction: parsed.data.auto_create_transaction,
  };

  const { data, error } = await supabase
    .from("reminders")
    .insert(insertPayload as never)
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = updateReminderSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid reminder data",
    };
  }

  // Verify category belongs to the user and is an expense category
  if (parsed.data.category_id) {
    const { data: category, error: catError } = await supabase
      .from("categories")
      .select("id")
      .eq("id", parsed.data.category_id)
      .eq("user_id", user.id)
      .eq("type", "expense")
      .maybeSingle();

    if (catError || !category) {
      return { success: false, error: "Category not found" };
    }
  }

  // category_id is nullable in DB but generated types don't reflect this.
  const updatePayload: Record<string, unknown> = {
    title: parsed.data.title,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    frequency: parsed.data.frequency,
    category_id: parsed.data.category_id ?? null,
    auto_create_transaction: parsed.data.auto_create_transaction,
  };

  const { data: updated, error } = await supabase
    .from("reminders")
    .update(updatePayload as never)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to update reminder" };
  }

  if (!updated || updated.length === 0) {
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = deleteReminderSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid data",
    };
  }

  const { data: deleted, error } = await supabase
    .from("reminders")
    .delete()
    .eq("id", parsed.data.id)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to delete reminder" };
  }

  if (!deleted || deleted.length === 0) {
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = markOccurrencePaidSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid data",
    };
  }

  // Fetch the reminder template
  const { data: reminder, error: fetchError } = await supabase
    .from("reminders")
    .select("id, title, amount, category_id, auto_create_transaction")
    .eq("id", parsed.data.reminder_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !reminder) {
    return { success: false, error: "Reminder not found" };
  }

  // Reserve the payment record first — the unique constraint on
  // (reminder_id, due_date) prevents races / double-pay atomically.
  const { data: reserved, error: reserveError } = await supabase
    .from("reminder_payments")
    .insert({
      reminder_id: parsed.data.reminder_id,
      user_id: user.id,
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

  // Create expense transaction if auto_create_transaction is enabled
  if (reminder.auto_create_transaction && reminder.category_id) {
    const { data: tx, error: txError } = await supabase
      .from("transactions")
      .insert({
        user_id: user.id,
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
      await supabase
        .from("reminder_payments")
        .delete()
        .eq("id", reserved.id);
      return { success: false, error: "Failed to create transaction" };
    }

    // Link the transaction to the payment record
    const { error: linkError } = await supabase
      .from("reminder_payments")
      .update({ transaction_id: tx.id } as never)
      .eq("id", reserved.id);

    if (linkError) {
      // Roll back: delete the orphaned transaction and reserved payment
      await supabase.from("transactions").delete().eq("id", tx.id);
      await supabase.from("reminder_payments").delete().eq("id", reserved.id);
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
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const parsed = markOccurrenceUnpaidSchema.safeParse(values);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return {
      success: false,
      error: firstIssue?.message ?? "Invalid data",
    };
  }

  const { data: deleted, error } = await supabase
    .from("reminder_payments")
    .delete()
    .eq("reminder_id", parsed.data.reminder_id)
    .eq("due_date", parsed.data.due_date)
    .eq("user_id", user.id)
    .select("id");

  if (error) {
    return { success: false, error: "Failed to remove payment" };
  }

  if (!deleted || deleted.length === 0) {
    return { success: false, error: "Payment record not found" };
  }

  revalidate();
  return { success: true };
}
