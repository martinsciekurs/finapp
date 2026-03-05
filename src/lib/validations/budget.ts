import { z } from "zod";

// ────────────────────────────────────────────
// Shared primitives
// ────────────────────────────────────────────

export const yearMonthSchema = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])$/,
    "Must be a valid year-month in YYYY-MM format"
  );

// ────────────────────────────────────────────
// Category budget schemas
// ────────────────────────────────────────────

export const upsertCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  yearMonth: yearMonthSchema,
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
});

export const removeCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  yearMonth: yearMonthSchema,
});

export const bulkUpsertCategoryBudgetsSchema = z.object({
  items: z
    .array(upsertCategoryBudgetSchema)
    .min(1, "At least one budget item is required")
    .max(500, "Too many items in a single request"),
});

// ────────────────────────────────────────────
// Income target schemas
// ────────────────────────────────────────────

export const upsertIncomeTargetSchema = z.object({
  yearMonth: yearMonthSchema,
  amount: z
    .number({ message: "Amount is required" })
    .positive("Amount must be positive"),
});

export const removeIncomeTargetSchema = z.object({
  yearMonth: yearMonthSchema,
});

// ────────────────────────────────────────────
// Inferred types
// ────────────────────────────────────────────

export type UpsertCategoryBudgetValues = z.infer<typeof upsertCategoryBudgetSchema>;
export type RemoveCategoryBudgetValues = z.infer<typeof removeCategoryBudgetSchema>;
export type BulkUpsertCategoryBudgetsValues = z.infer<typeof bulkUpsertCategoryBudgetsSchema>;
export type UpsertIncomeTargetValues = z.infer<typeof upsertIncomeTargetSchema>;
export type RemoveIncomeTargetValues = z.infer<typeof removeIncomeTargetSchema>;
