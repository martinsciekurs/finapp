import { z } from "zod";

export const debtTypeEnum = z.enum(["i_owe", "they_owe"]);

const amountSchema = z
  .number({ message: "Amount is required" })
  .positive("Amount must be positive")
  .max(9999999999.99, "Amount exceeds allowed maximum")
  .refine((value) => {
    const cents = value * 100;
    const tolerance = Math.max(1e-8, Number.EPSILON * Math.abs(cents));
    return Math.abs(Math.round(cents) - cents) < tolerance;
  }, "Amount must have at most 2 decimal places");

const optionalText = z
  .string()
  .trim()
  .max(500, "Text too long")
  .optional()
  .or(z.literal(""));

const debtDateSchema = z.string().date("Invalid debt date");

export const createDebtSchema = z.object({
  counterparty: z
    .string()
    .trim()
    .min(1, "Counterparty name is required")
    .max(100, "Name too long"),
  type: debtTypeEnum,
  category_id: z.string().uuid("Invalid category"),
  debt_date: debtDateSchema,
  original_amount: amountSchema,
  description: optionalText,
});

export const updateDebtSchema = createDebtSchema.extend({
  id: z.string().uuid("Invalid debt ID"),
  category_id: z.string().uuid("Invalid category").or(z.literal("")),
});

const paymentDateSchema = z.string().date("Invalid payment date");

export const createDebtPaymentSchema = z.object({
  debt_id: z.string().uuid("Invalid debt"),
  amount: amountSchema,
  payment_date: paymentDateSchema,
  note: optionalText,
});

export const updateDebtPaymentSchema = z.object({
  id: z.string().uuid("Invalid payment ID"),
  amount: amountSchema,
  payment_date: paymentDateSchema,
  note: optionalText,
});

export const deleteDebtSchema = z.object({
  id: z.string().uuid("Invalid debt ID"),
  delete_linked_transactions: z.boolean().optional(),
});

export const deleteDebtPaymentSchema = z.object({
  id: z.string().uuid("Invalid payment ID"),
});

export type CreateDebtValues = z.infer<typeof createDebtSchema>;
export type UpdateDebtValues = z.infer<typeof updateDebtSchema>;
export type CreateDebtPaymentValues = z.infer<typeof createDebtPaymentSchema>;
export type UpdateDebtPaymentValues = z.infer<typeof updateDebtPaymentSchema>;
export type DeleteDebtValues = z.infer<typeof deleteDebtSchema>;
export type DeleteDebtPaymentValues = z.infer<typeof deleteDebtPaymentSchema>;
