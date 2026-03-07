import { z } from "zod";

function parseAmountInput(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/[^0-9.,-]/g, "").replace(/,/g, ".");
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseDateInput(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function parseConfidenceInput(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 0 && value <= 1) {
      return value;
    }

    if (value > 1 && value <= 100) {
      return value / 100;
    }
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.trim());
    if (Number.isFinite(parsed)) {
      if (parsed >= 0 && parsed <= 1) {
        return parsed;
      }
      if (parsed > 1 && parsed <= 100) {
        return parsed / 100;
      }
    }
  }

  return 0.7;
}

/**
 * AI input validation — max 100 words / 1000 chars.
 * Shared between client (form validation) and server (API routes).
 */
export const aiInputSchema = z.object({
  text: z
    .string()
    .transform((val) => val.trim())
    .pipe(
      z
        .string()
        .min(1, "Please enter some text")
        .max(1000, "Input must be at most 1000 characters")
        .refine(
          (val) => val.split(/\s+/).filter(Boolean).length <= 100,
          "Input must be at most 100 words"
        )
    ),
});

export const aiChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, "Message cannot be empty").max(4000)),
});

export const aiChatRequestSchema = z.object({
  messages: z
    .array(aiChatMessageSchema)
    .min(1, "At least one message is required")
    .max(20, "Conversation is too long"),
  currentDraft: z
    .object({
      type: z.enum(["expense", "income"]),
      amount: z.number().positive().nullable(),
      category_id: z.string().uuid().nullable(),
      category_name: z.string().min(1).max(100).nullable(),
      description: z.string().min(1).max(500).nullable(),
      date: z.string().date("Invalid date").nullable(),
      confidence: z.number().min(0).max(1),
      missing_fields: z.array(
        z.enum(["amount", "category_id", "date", "type"])
      ),
      needs_confirmation: z.literal(true),
    })
    .optional(),
});

export const aiSuggestionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().positive().nullable(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export const aiTransactionDraftSchema = z.object({
  type: z.preprocess(
    (value) => (typeof value === "string" ? value.toLowerCase().trim() : value),
    z.enum(["expense", "income"])
  ),
  amount: z
    .preprocess((value) => parseAmountInput(value), z.number().positive().nullable())
    .nullable(),
  category_id: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0 ? value.trim() : null,
      z.string().min(1).nullable()
    )
    .nullable(),
  category_name: z.string().min(1).max(100).nullable(),
  description: z.string().min(1).max(500).nullable(),
  date: z.preprocess((value) => parseDateInput(value), z.string().nullable()),
  confidence: z.preprocess(
    (value) => parseConfidenceInput(value),
    z.number().min(0).max(1)
  ),
  missing_fields: z
    .array(z.enum(["amount", "category_id", "date", "type"]))
    .default([]),
  needs_confirmation: z.boolean().default(true),
});

export const aiAssistantResponseSchema = z.object({
  message: z
    .string()
    .transform((val) => val.trim())
    .pipe(z.string().min(1, "Response cannot be empty").max(4000)),
  draft: aiTransactionDraftSchema.nullable(),
});

export type AiInput = z.infer<typeof aiInputSchema>;
export type AiChatMessage = z.infer<typeof aiChatMessageSchema>;
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
export type AiTransactionDraft = z.infer<typeof aiTransactionDraftSchema>;
export type AiAssistantResponse = z.infer<typeof aiAssistantResponseSchema>;
