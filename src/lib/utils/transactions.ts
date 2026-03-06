import type { CategoryOption } from "@/lib/types/transactions";

export type TransactionFormType = CategoryOption["type"];

export function filterCategoriesByType(
  categories: CategoryOption[],
  type: TransactionFormType
): CategoryOption[] {
  return categories.filter((category) => category.type === type);
}

export function parseAmountInput(value: string): number | undefined {
  if (value === "") {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}
