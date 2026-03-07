import "server-only";

import type { AiTransactionDraft } from "@/lib/validations/ai";

export interface CategoryContext {
  id: string;
  name: string;
  type: "expense" | "income";
}

export function parseCategoryContext(
  categories: Array<{ id?: unknown; name?: unknown; type?: unknown }>
): CategoryContext[] {
  return categories.filter(
    (category): category is CategoryContext =>
      typeof category.id === "string" &&
      typeof category.name === "string" &&
      (category.type === "expense" || category.type === "income")
  );
}

export function splitCategoriesByType(categories: CategoryContext[]): {
  expenseCategories: Array<{ id: string; name: string }>;
  incomeCategories: Array<{ id: string; name: string }>;
} {
  return {
    expenseCategories: categories
      .filter((category) => category.type === "expense")
      .map((category) => ({ id: category.id, name: category.name })),
    incomeCategories: categories
      .filter((category) => category.type === "income")
      .map((category) => ({ id: category.id, name: category.name })),
  };
}

export function normalizeTransactionDraft(
  draft: AiTransactionDraft | null,
  categories: CategoryContext[]
): AiTransactionDraft | null {
  if (!draft) {
    return null;
  }

  const categoriesById = new Map<string, CategoryContext>(
    categories.map((category) => [category.id, category])
  );

  const resolvedDraft: AiTransactionDraft = {
    ...draft,
    category_id: draft.category_id,
    category_name: draft.category_name,
  };

  if (resolvedDraft.category_id) {
    const matched = categoriesById.get(resolvedDraft.category_id);
    if (!matched || matched.type !== resolvedDraft.type) {
      resolvedDraft.category_id = null;
      resolvedDraft.category_name = null;
    } else {
      resolvedDraft.category_name = matched.name;
    }
  }

  if (!resolvedDraft.category_id && resolvedDraft.category_name) {
    const normalizedName = resolvedDraft.category_name.trim().toLowerCase();
    const sameTypeCategories = categories.filter(
      (category) => category.type === resolvedDraft.type
    );

    const categoryMatch =
      sameTypeCategories.find(
        (category) => category.name.trim().toLowerCase() === normalizedName
      ) ??
      sameTypeCategories.find((category) =>
        category.name.trim().toLowerCase().includes(normalizedName)
      );

    if (categoryMatch) {
      resolvedDraft.category_id = categoryMatch.id;
      resolvedDraft.category_name = categoryMatch.name;
    }
  }

  const missing = new Set(resolvedDraft.missing_fields);
  if (resolvedDraft.amount === null) {
    missing.add("amount");
  }
  if (resolvedDraft.category_id === null) {
    missing.add("category_id");
  }
  if (resolvedDraft.date === null) {
    missing.add("date");
  }

  return {
    ...resolvedDraft,
    missing_fields: Array.from(missing),
    needs_confirmation: true,
  };
}
