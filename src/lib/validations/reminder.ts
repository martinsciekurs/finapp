import { z } from "zod";

// ────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────

export const reminderFrequencyEnum = z.enum([
  "monthly",
  "weekly",
  "yearly",
  "one_time",
]);

/** Reusable amount schema matching DB numeric(12,2). */
const amountSchema = z
  .number({ message: "Amount is required" })
  .positive("Amount must be positive")
  .max(9999999999.99, "Amount exceeds allowed maximum");

// ────────────────────────────────────────────
// Create reminder
// ────────────────────────────────────────────

export const createReminderSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  amount: amountSchema,
  due_date: z.string().date("Invalid date"),
  frequency: reminderFrequencyEnum,
  category_id: z.string().uuid("Invalid category").optional(),
  auto_create_transaction: z.boolean().default(true),
});

// ────────────────────────────────────────────
// Update reminder
// ────────────────────────────────────────────

export const updateReminderSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  amount: amountSchema,
  due_date: z.string().date("Invalid date"),
  frequency: reminderFrequencyEnum,
  category_id: z.string().uuid("Invalid category").optional().nullable(),
  auto_create_transaction: z.boolean(),
});

// ────────────────────────────────────────────
// Delete reminder
// ────────────────────────────────────────────

export const deleteReminderSchema = z.object({
  id: z.string().uuid("Invalid reminder ID"),
});

// ────────────────────────────────────────────
// Mark occurrence as paid (per-period)
// ────────────────────────────────────────────

export const markOccurrencePaidSchema = z.object({
  reminder_id: z.string().uuid("Invalid reminder ID"),
  due_date: z.string().date("Invalid date"),
});

// ────────────────────────────────────────────
// Mark occurrence as unpaid (per-period)
// ────────────────────────────────────────────

export const markOccurrenceUnpaidSchema = z.object({
  reminder_id: z.string().uuid("Invalid reminder ID"),
  due_date: z.string().date("Invalid date"),
});

// ────────────────────────────────────────────
// Legacy: mark as paid (kept for backward compat)
// ────────────────────────────────────────────

export const markAsPaidSchema = z.object({
  id: z.string().uuid("Invalid reminder ID"),
});

// ────────────────────────────────────────────
// Form-only schema (excludes auto_create_transaction default
// to avoid react-hook-form input/output type mismatch)
// ────────────────────────────────────────────

export const reminderFormSchema = z.object({
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  amount: amountSchema,
  due_date: z.string().date("Invalid date"),
  frequency: reminderFrequencyEnum,
  category_id: z.string().uuid("Invalid category").optional(),
  auto_create_transaction: z.boolean(),
});

// ────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────

export type CreateReminderValues = z.infer<typeof createReminderSchema>;
export type UpdateReminderValues = z.infer<typeof updateReminderSchema>;
export type DeleteReminderValues = z.infer<typeof deleteReminderSchema>;
export type MarkOccurrencePaidValues = z.infer<typeof markOccurrencePaidSchema>;
export type MarkOccurrenceUnpaidValues = z.infer<typeof markOccurrenceUnpaidSchema>;
export type MarkAsPaidValues = z.infer<typeof markAsPaidSchema>;
export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
