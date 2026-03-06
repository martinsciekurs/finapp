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

/** Frequency type derived from the Zod enum — single source of truth. */
export type ReminderFrequency = z.infer<typeof reminderFrequencyEnum>;

/** Reusable amount schema matching DB numeric(12,2). */
const amountSchema = z
  .number({ message: "Amount is required" })
  .positive("Amount must be positive")
  .max(9999999999.99, "Amount exceeds allowed maximum")
  .refine(
    (value) =>
      Math.abs(Math.round(value * 100) - value * 100) < 1e-8,
    "Amount must have at most 2 decimal places"
  );

/** Base fields shared by create, update, and form schemas. */
const baseReminderFields = {
  title: z
    .string({ message: "Title is required" })
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  amount: amountSchema,
  due_date: z.string().date("Invalid date"),
  frequency: reminderFrequencyEnum,
  category_id: z.string().uuid("Invalid category"),
};

// ────────────────────────────────────────────
// Create reminder
// ────────────────────────────────────────────

export const createReminderSchema = z.object({
  ...baseReminderFields,
  auto_create_transaction: z.boolean().default(true),
});

// ────────────────────────────────────────────
// Update reminder
// ────────────────────────────────────────────

export const updateReminderSchema = z.object({
  ...baseReminderFields,
  auto_create_transaction: z.boolean(),
});

// ────────────────────────────────────────────
// Delete reminder
// ────────────────────────────────────────────

export const deleteReminderSchema = z.object({
  id: z.string().uuid("Invalid reminder ID"),
});

// ────────────────────────────────────────────
// Mark occurrence paid / unpaid (per-period)
// ────────────────────────────────────────────

/** Identifies a specific occurrence of a reminder by ID + due date. */
export const occurrenceIdentifierSchema = z.object({
  reminder_id: z.string().uuid("Invalid reminder ID"),
  due_date: z.string().date("Invalid date"),
});

export const markOccurrencePaidSchema = occurrenceIdentifierSchema;
export const markOccurrenceUnpaidSchema = occurrenceIdentifierSchema;

// ────────────────────────────────────────────
// Form-only schema (structurally identical to updateReminderSchema —
// aliased to avoid react-hook-form input/output type mismatch
// from createReminderSchema's `.default(true)`)
// ────────────────────────────────────────────

export const reminderFormSchema = updateReminderSchema;

// ────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────

export type CreateReminderValues = z.infer<typeof createReminderSchema>;
export type UpdateReminderValues = z.infer<typeof updateReminderSchema>;
export type DeleteReminderValues = z.infer<typeof deleteReminderSchema>;
export type MarkOccurrencePaidValues = z.infer<typeof markOccurrencePaidSchema>;
export type MarkOccurrenceUnpaidValues = z.infer<typeof markOccurrenceUnpaidSchema>;
export type ReminderFormValues = z.infer<typeof reminderFormSchema>;
