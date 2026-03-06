import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import {
  filterByCategory,
  TransactionCategoryFilter,
} from "../transaction-category-filter";
import type { TransactionData, CategoryOption } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function makeTx(overrides: Partial<TransactionData> & { date?: string }): TransactionData {
  return {
    id: `tx-${Math.random()}`,
    amount: 100,
    type: "expense",
    description: "Test",
    date: "2026-01-01",
    categoryId: "cat-1",
    categoryName: "General",
    categoryIcon: "circle",
    categoryColor: null,
    attachments: [],
    tags: [],
    ...overrides,
  };
}

function makeCat(overrides: Partial<CategoryOption>): CategoryOption {
  return {
    id: `cat-${Math.random()}`,
    name: "Test Category",
    icon: "circle",
    color: "#000000",
    type: "expense",
    group_id: null,
    group_name: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────
// filterByCategory
// ────────────────────────────────────────────

describe("filterByCategory", () => {
  const txList: TransactionData[] = [
    makeTx({ id: "tx-1", categoryId: "cat-1", categoryName: "Food" }),
    makeTx({ id: "tx-2", categoryId: "cat-2", categoryName: "Transport" }),
    makeTx({ id: "tx-3", categoryId: "cat-1", categoryName: "Food" }),
    makeTx({ id: "tx-4", categoryId: "cat-3", categoryName: "Entertainment" }),
  ];

  it("returns all transactions when categoryId is null", () => {
    const result = filterByCategory(txList, null);
    expect(result).toHaveLength(4);
    expect(result).toEqual(txList);
  });

  it("filters correctly when categoryId is set", () => {
    const result = filterByCategory(txList, "cat-1");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.id)).toEqual(["tx-1", "tx-3"]);
  });

  it("returns empty when no transactions match", () => {
    const result = filterByCategory(txList, "cat-999");
    expect(result).toHaveLength(0);
  });
});

// ────────────────────────────────────────────
// TransactionCategoryFilter component
// ────────────────────────────────────────────

describe("TransactionCategoryFilter", () => {
  let onChange: ReturnType<typeof vi.fn<(categoryId: string | null) => void>>;

  const categories: CategoryOption[] = [
    makeCat({
      id: "cat-1",
      name: "Food",
      icon: "utensils",
      color: "#FF6B6B",
      group_id: "group-1",
      group_name: "Expenses",
    }),
    makeCat({
      id: "cat-2",
      name: "Transport",
      icon: "car",
      color: "#4ECDC4",
      group_id: "group-1",
      group_name: "Expenses",
    }),
    makeCat({
      id: "cat-3",
      name: "Salary",
      icon: "banknote",
      color: "#95E1D3",
      group_id: "group-2",
      group_name: "Income",
    }),
  ];

  beforeEach(() => {
    onChange = vi.fn<(categoryId: string | null) => void>();
  });

  it("renders with 'All Categories' as default text", () => {
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /all categories/i })).toBeInTheDocument();
  });

  it("opens popover on click", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all categories/i }));

    // Should show search input
    expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument();
  });

  it("shows categories grouped by group_name", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all categories/i }));

    // Should show group headings
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
  });

  it("shows 'All Categories' as first option", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all categories/i }));

    const options = screen.getAllByRole("option");
    expect(options[0]).toHaveTextContent("All Categories");
  });

  it("selecting a category calls onChange with categoryId", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all categories/i }));
    await user.click(screen.getByText("Food"));

    expect(onChange).toHaveBeenCalledWith("cat-1");
  });

  it("selecting 'All Categories' calls onChange with null", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value="cat-1"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /food/i }));
    const allCategoriesOptions = screen.getAllByText("All Categories");
    await user.click(allCategoriesOptions[0]);

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("shows selected category name on button when filtered", () => {
    render(
      <TransactionCategoryFilter
        categories={categories}
        value="cat-1"
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /food/i })).toBeInTheDocument();
  });

  it("closes popover after selecting a category", async () => {
    const user = userEvent.setup();
    render(
      <TransactionCategoryFilter
        categories={categories}
        value={null}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all categories/i }));
    expect(screen.getByPlaceholderText(/search categories/i)).toBeInTheDocument();

    await user.click(screen.getByText("Food"));

    // Search input should be gone (popover closed)
    expect(screen.queryByPlaceholderText(/search categories/i)).not.toBeInTheDocument();
  });
});
