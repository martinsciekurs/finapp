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

/** Reusable amount schema matching DB numeric(12,2). */
const amountSchema = z
  .number({ message: "Amount is required" })
  .positive("Amount must be positive")
  .max(9999999999.99, "Amount exceeds allowed maximum");

// ────────────────────────────────────────────
// Category budget schemas
// ────────────────────────────────────────────

export const upsertCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  yearMonth: yearMonthSchema,
  amount: amountSchema,
});

export const removeCategoryBudgetSchema = z.object({
  categoryId: z.string().uuid("Invalid category"),
  yearMonth: yearMonthSchema,
});

export const bulkUpsertCategoryBudgetsSchema = z
  .object({
    items: z
      .array(upsertCategoryBudgetSchema)
      .min(1, "At least one budget item is required")
      .max(500, "Too many items in a single request"),
  })
  .refine(
    (data) => {
      const keys = new Set<string>();
      for (const item of data.items) {
        const key = `${item.categoryId}:${item.yearMonth}`;
        if (keys.has(key)) return false;
        keys.add(key);
      }
      return true;
    },
    { message: "Duplicate category/month pairs are not allowed" }
  );

// ────────────────────────────────────────────
// Income target schemas
// ────────────────────────────────────────────

export const upsertIncomeTargetSchema = z.object({
  yearMonth: yearMonthSchema,
  amount: amountSchema,
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
