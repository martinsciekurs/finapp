import { z } from "zod";

export const profileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  currency: z.string().length(3, "Please select a currency"),
});

export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
