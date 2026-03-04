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

export const updateTransactionSchema = createTransactionSchema.partial();

export type CreateTransactionValues = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionValues = z.infer<typeof updateTransactionSchema>;
