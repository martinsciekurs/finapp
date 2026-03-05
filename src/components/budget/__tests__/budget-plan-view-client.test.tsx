import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { PlannerData, SpendingSuggestion } from "@/lib/types/budget";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams("view=plan"),
}));

vi.mock("@/app/dashboard/budget/actions", () => ({
  upsertIncomeTarget: vi.fn().mockResolvedValue({ success: true }),
  bulkUpsertCategoryBudgets: vi.fn().mockResolvedValue({ success: true }),
  upsertCategoryBudget: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/components/ui/category-icon", () => ({
  CategoryIcon: ({ name }: { name: string }) => (
    <span data-testid="category-icon">{name}</span>
  ),
}));

vi.mock("@/lib/utils/date", () => ({
  getCurrentYearMonth: () => "2026-03",
}));

import { BudgetPlanViewClient } from "../budget-plan-view-client";

function makeCells(year: number, budgeted = 0, spent = 0) {
  return Array.from({ length: 12 }, (_, i) => ({
    yearMonth: `${year}-${String(i + 1).padStart(2, "0")}`,
    budgeted,
    spent,
  }));
}

const plannerData: PlannerData = {
  year: 2026,
  income: {
    cells: Array.from({ length: 12 }, (_, i) => ({
      yearMonth: `2026-${String(i + 1).padStart(2, "0")}`,
      amount: 5000,
    })),
  },
  categories: [
    {
      categoryId: "c1",
      name: "Groceries",
      icon: "shopping-cart",
      color: "#4CAF50",
      groupId: "g1",
      groupName: "Essentials",
      cells: makeCells(2026, 500, 350),
    },
    {
      categoryId: "c2",
      name: "Entertainment",
      icon: "film",
      color: "#9C27B0",
      groupId: "g2",
      groupName: "Lifestyle",
      cells: makeCells(2026, 200, 100),
    },
  ],
};

const suggestions: SpendingSuggestion[] = [
  {
    categoryId: "c1",
    name: "Groceries",
    icon: "shopping-cart",
    color: "#4CAF50",
    suggestedAmount: 480,
  },
];

const emptyPlannerData: PlannerData = {
  year: 2026,
  income: {
    cells: Array.from({ length: 12 }, (_, i) => ({
      yearMonth: `2026-${String(i + 1).padStart(2, "0")}`,
      amount: 0,
    })),
  },
  categories: [],
};

describe("BudgetPlanViewClient", () => {
  it("renders the year in the year selector", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("2026")).toBeInTheDocument();
  });

  it("renders all 12 month column headers", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const month of months) {
      expect(screen.getByText(month)).toBeInTheDocument();
    }
  });

  it("renders Income Target row", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("Income Target")).toBeInTheDocument();
  });

  it("renders category names", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("renders group headers", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("Essentials")).toBeInTheDocument();
    expect(screen.getByText("Lifestyle")).toBeInTheDocument();
  });

  it("renders Fill from spending button", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("Fill from spending")).toBeInTheDocument();
  });

  it("disables Fill from spending button when no suggestions", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={[]}
        currency="USD"
      />
    );
    const fillButton = screen.getByText("Fill from spending").closest("button");
    expect(fillButton).toBeDisabled();
  });

  it("renders year navigation buttons", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByLabelText("Previous year")).toBeInTheDocument();
    expect(screen.getByLabelText("Next year")).toBeInTheDocument();
  });

  it("navigates to previous year on click", async () => {
    const user = userEvent.setup();
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    await user.click(screen.getByLabelText("Previous year"));
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("year=2025")
    );
  });

  it("renders Category column header", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    expect(screen.getByText("Category")).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(
      <BudgetPlanViewClient
        data={plannerData}
        suggestions={suggestions}
        currency="USD"
      />
    );
    const icons = screen.getAllByTestId("category-icon");
    expect(icons).toHaveLength(2);
  });
});
