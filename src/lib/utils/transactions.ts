import type { CategoryOption } from "@/lib/types/transactions";
import { parseCategoryJoin } from "@/lib/types/dashboard";

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

interface TransactionCategoryDisplay {
  categoryName: string;
  categoryIcon: string;
  categoryColor: string | null;
}

export function getTransactionCategoryDisplay(
  rawCategory: unknown
): TransactionCategoryDisplay {
  const category = parseCategoryJoin(rawCategory);

  return {
    categoryName: category?.name ?? "Uncategorized",
    categoryIcon: category?.icon ?? "circle",
    categoryColor: category?.color ?? null,
  };
}
