import { z } from "zod";

export const createTagSchema = z.object({
  name: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : v),
    z.string().min(1, "Tag name is required").max(30, "Tag name must be 30 characters or less")
  ),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color (e.g. #FF5733)"),
});

export const assignTagSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  tagId: z.string().uuid("Invalid tag ID"),
});

export const removeTagSchema = z.object({
  transactionId: z.string().uuid("Invalid transaction ID"),
  tagId: z.string().uuid("Invalid tag ID"),
});

export type CreateTagValues = z.infer<typeof createTagSchema>;
export type AssignTagValues = z.infer<typeof assignTagSchema>;
export type RemoveTagValues = z.infer<typeof removeTagSchema>;
