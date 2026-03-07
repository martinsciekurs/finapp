import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  normalizeTransactionDraft,
  parseCategoryContext,
  splitCategoriesByType,
  type CategoryContext,
} from "../transaction-draft";

const categories: CategoryContext[] = [
  {
    id: "cat-expense-dining",
    name: "Dining Out",
    type: "expense",
  },
  {
    id: "cat-income-salary",
    name: "Salary",
    type: "income",
  },
];

describe("parseCategoryContext", () => {
  it("filters invalid category rows", () => {
    const parsed = parseCategoryContext([
      {
        id: "cat-expense-dining",
        name: "Dining Out",
        type: "expense",
      },
      {
        id: 1,
        name: "Broken",
        type: "expense",
      },
      {
        id: "cat-invalid",
        name: "Invalid",
        type: "transfer",
      },
    ]);

    expect(parsed).toEqual([
      {
        id: "cat-expense-dining",
        name: "Dining Out",
        type: "expense",
      },
    ]);
  });
});

describe("splitCategoriesByType", () => {
  it("splits expense and income categories", () => {
    const split = splitCategoriesByType(categories);
    expect(split.expenseCategories).toEqual([
      { id: "cat-expense-dining", name: "Dining Out" },
    ]);
    expect(split.incomeCategories).toEqual([
      { id: "cat-income-salary", name: "Salary" },
    ]);
  });
});

describe("normalizeTransactionDraft", () => {
  it("drops mismatched category type and marks category as missing", () => {
    const normalized = normalizeTransactionDraft(
      {
        type: "expense",
        amount: 10,
        category_id: "cat-income-salary",
        category_name: "Salary",
        description: "test",
        date: "2026-03-07",
        confidence: 0.7,
        missing_fields: [],
        needs_confirmation: true,
      },
      categories
    );

    expect(normalized?.category_id).toBeNull();
    expect(normalized?.missing_fields).toContain("category_id");
  });
});
