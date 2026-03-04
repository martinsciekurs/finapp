import { z } from "zod";

export const debtTypeEnum = z.enum(["i_owe", "they_owe"]);

export const createDebtSchema = z.object({
  counterparty: z
    .string()
    .min(1, "Counterparty name is required")
    .max(100, "Name too long"),
  type: debtTypeEnum,
  original_amount: z.number().positive("Amount must be positive"),
  description: z.string().max(500, "Description too long").optional(),
});

export const createDebtPaymentSchema = z.object({
  debt_id: z.string().uuid("Invalid debt"),
  amount: z.number().positive("Amount must be positive"),
  note: z.string().max(500, "Note too long").optional(),
});

export type CreateDebtValues = z.infer<typeof createDebtSchema>;
export type CreateDebtPaymentValues = z.infer<typeof createDebtPaymentSchema>;
