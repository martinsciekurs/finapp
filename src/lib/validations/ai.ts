import { z } from "zod";

/**
 * AI input validation — max 100 words / 1000 chars.
 * Shared between client (form validation) and server (API routes).
 */
export const aiInputSchema = z.object({
  text: z
    .string()
    .min(1, "Please enter some text")
    .max(1000, "Input must be at most 1000 characters")
    .refine(
      (val) => val.trim().split(/\s+/).length <= 100,
      "Input must be at most 100 words"
    ),
});

export const aiSuggestionSchema = z.object({
  type: z.enum(["expense", "income"]),
  amount: z.number().positive().nullable(),
  category: z.string().nullable(),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

export type AiInput = z.infer<typeof aiInputSchema>;
export type AiSuggestion = z.infer<typeof aiSuggestionSchema>;
