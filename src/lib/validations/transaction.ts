import { z } from "zod";

export const transactionTypeEnum = z.enum(["expense", "income"]);
export const transactionSourceEnum = z.enum(["web", "telegram", "voice"]);

export const createTransactionSchema = z.object({
  category_id: z.string().uuid("Invalid category"),
  amount: z.number().positive("Amount must be positive"),
  type: transactionTypeEnum,
  description: z.string().max(500, "Description too long").optional(),
  date: z.string().date("Invalid date"),
  source: transactionSourceEnum.default("web"),
  ai_generated: z.boolean().default(false),
});

// Build update schema without defaults so parsing {} doesn't materialize
// source/ai_generated values — partial updates should only contain
// explicitly provided fields.
export const updateTransactionSchema = z.object({
  category_id: z.string().uuid("Invalid category"),
  amount: z.number().positive("Amount must be positive"),
  type: transactionTypeEnum,
  description: z.string().max(500, "Description too long"),
  date: z.string().date("Invalid date"),
  source: transactionSourceEnum,
  ai_generated: z.boolean(),
}).partial();

export type CreateTransactionValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionValues = z.infer<typeof updateTransactionSchema>;
