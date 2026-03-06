import { z } from "zod";
import { CURRENCIES } from "@/lib/config/currencies";

const supportedCurrencyCodes = new Set(CURRENCIES.map((currency) => currency.code));

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be at most 50 characters"),
  currency: z
    .string()
    .trim()
    .length(3, "Please select a currency")
    .refine((code) => supportedCurrencyCodes.has(code), {
      message: "Please select a supported currency",
    }),
});

export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type ProfileValues = z.infer<typeof profileSchema>;
export type EmailValues = z.infer<typeof emailSchema>;
