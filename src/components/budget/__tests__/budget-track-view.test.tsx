import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { BudgetPageData } from "@/lib/types/budget";

// Mock server actions
vi.mock("@/app/dashboard/budget/actions", () => ({
  upsertCategoryBudget: vi.fn().mockResolvedValue({ success: true }),
  upsertIncomeTarget: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock CategoryIcon
vi.mock("@/components/ui/category-icon", () => ({
  CategoryIcon: ({ name, "aria-label": label }: { name: string; "aria-label"?: string }) => (
    <span data-testid="category-icon" aria-label={label}>{name}</span>
  ),
}));

// Mock next/navigation for period selector / plan view
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

import { BudgetTrackView } from "../budget-track-view";

const emptyData: BudgetPageData = {
  summary: {
    incomeTarget: 0,
    totalBudgeted: 0,
    leftToAssign: 0,
    totalSpent: 0,
    leftToSpend: 0,
  },
  groups: [],
};

const sampleData: BudgetPageData = {
  summary: {
    incomeTarget: 5000,
    totalBudgeted: 3000,
    leftToAssign: 2000,
    totalSpent: 1500,
    leftToSpend: 1500,
  },
  groups: [
    {
      groupId: "g1",
      groupName: "Essentials",
      groupSortOrder: 0,
      budgetedCategories: [
        {
          id: "b1",
          categoryId: "c1",
          name: "Groceries",
          icon: "shopping-cart",
          color: "#4CAF50",
          groupId: "g1",
          groupName: "Essentials",
          budgeted: 500,
          spent: 350,
        },
        {
          id: "b2",
          categoryId: "c2",
          name: "Transport",
          icon: "car",
          color: "#2196F3",
          groupId: "g1",
          groupName: "Essentials",
          budgeted: 200,
          spent: 180,
        },
      ],
      unbudgetedCategories: [
        {
          categoryId: "c3",
          name: "Coffee",
          icon: "utensils",
          color: "#FF5722",
          groupId: "g1",
          groupName: "Essentials",
          spent: 45,
        },
      ],
    },
  ],
};

describe("BudgetTrackView", () => {
  it("shows empty state when no budgets and no groups", () => {
    render(
      <BudgetTrackView
        data={emptyData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("No budgets yet")).toBeInTheDocument();
  });

  it("renders summary card with income target", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("Expected Income")).toBeInTheDocument();
    expect(screen.getByText("Total Budgeted")).toBeInTheDocument();
    expect(screen.getByText("Left to Assign")).toBeInTheDocument();
    expect(screen.getByText("Total Spent")).toBeInTheDocument();
    expect(screen.getByText("Left to Spend")).toBeInTheDocument();
  });

  it("renders group header", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("Essentials")).toBeInTheDocument();
  });

  it("renders budgeted category names", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("renders unbudgeted categories with Set budget button", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText("Set budget")).toBeInTheDocument();
  });

  it("renders progress bars with correct aria attributes", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(2); // 2 budgeted categories

    // Groceries: 350/500 = 70%
    expect(progressBars[0]).toHaveAttribute("aria-valuenow", "70");
    expect(progressBars[0]).toHaveAttribute(
      "aria-label",
      "Groceries budget: 70% used"
    );

    // Transport: 180/200 = 90%
    expect(progressBars[1]).toHaveAttribute("aria-valuenow", "90");
    expect(progressBars[1]).toHaveAttribute(
      "aria-label",
      "Transport budget: 90% used"
    );
  });

  it("renders category icons", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    const icons = screen.getAllByTestId("category-icon");
    expect(icons.length).toBeGreaterThanOrEqual(3); // 2 budgeted + 1 unbudgeted
  });

  it("renders summary amounts when income target is set", () => {
    render(
      <BudgetTrackView
        data={sampleData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    // Check that the income amount is displayed
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("shows no category spending empty state when income set but no groups", () => {
    const incomeOnlyData: BudgetPageData = {
      summary: {
        incomeTarget: 5000,
        totalBudgeted: 0,
        leftToAssign: 5000,
        totalSpent: 0,
        leftToSpend: 0,
      },
      groups: [],
    };
    render(
      <BudgetTrackView
        data={incomeOnlyData}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("No category spending")).toBeInTheDocument();
  });
});
