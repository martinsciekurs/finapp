import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { BudgetCategoryData } from "@/lib/types/dashboard";

// Mock framer-motion
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      style,
      ...rest
    }: React.ComponentProps<"div"> & { style?: React.CSSProperties }) => (
      <div className={className} style={style} {...rest}>
        {children}
      </div>
    ),
  },
  useReducedMotion: () => true,
}));

// Mock CategoryIcon to render the name as text for easy assertions
vi.mock("@/components/ui/category-icon", () => ({
  CategoryIcon: ({ name, "aria-label": label }: { name: string; "aria-label"?: string }) => (
    <span data-testid="category-icon" aria-label={label}>{name}</span>
  ),
}));

import { BudgetOverview } from "../budget-overview";

describe("BudgetOverview", () => {
  const sampleCategories: BudgetCategoryData[] = [
    {
      id: "cat-1",
      name: "Groceries",
      icon: "shopping-cart",
      color: "#4CAF50",
      budgetLimit: 500,
      spent: 350,
    },
    {
      id: "cat-2",
      name: "Transportation",
      icon: "car",
      color: "#2196F3",
      budgetLimit: 200,
      spent: 180,
    },
    {
      id: "cat-3",
      name: "Dining Out",
      icon: "utensils",
      color: "#FF5722",
      budgetLimit: 150,
      spent: 160,
    },
  ];

  it("renders category names", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transportation")).toBeInTheDocument();
    expect(screen.getByText("Dining Out")).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    const icons = screen.getAllByTestId("category-icon");
    expect(icons).toHaveLength(3);
    expect(icons[0]).toHaveTextContent("shopping-cart");
    expect(icons[1]).toHaveTextContent("car");
    expect(icons[2]).toHaveTextContent("utensils");
  });

  it("renders Budget Overview heading", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    expect(screen.getByText("Budget Overview")).toBeInTheDocument();
  });

  it("renders formatted spent/budget amounts", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    expect(screen.getByText("$350.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("renders progress bars with correct aria attributes", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(3);

    // Groceries: 350/500 = 70%
    expect(progressBars[0]).toHaveAttribute("aria-valuenow", "70");
    expect(progressBars[0]).toHaveAttribute("aria-valuemin", "0");
    expect(progressBars[0]).toHaveAttribute("aria-valuemax", "100");

    // Transportation: 180/200 = 90%
    expect(progressBars[1]).toHaveAttribute("aria-valuenow", "90");

    // Dining Out: 160/150 = capped at 100%
    expect(progressBars[2]).toHaveAttribute("aria-valuenow", "100");
  });

  it("renders accessible labels on progress bars", () => {
    render(
      <BudgetOverview categories={sampleCategories} currency="USD" />
    );

    expect(
      screen.getByLabelText("Groceries budget: 70% used")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Transportation budget: 90% used")
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Dining Out budget: 100% used")
    ).toBeInTheDocument();
  });

  it("shows empty state when no categories have budgets", () => {
    render(<BudgetOverview categories={[]} currency="USD" />);

    expect(screen.getByText("No budgets set")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Set budget limits on your expense categories to track your spending here."
      )
    ).toBeInTheDocument();
  });

  it("does not render card when empty", () => {
    render(<BudgetOverview categories={[]} currency="USD" />);

    expect(screen.queryByText("Budget Overview")).not.toBeInTheDocument();
  });

  it("handles zero budget limit gracefully", () => {
    const zeroCategory: BudgetCategoryData[] = [
      {
        id: "cat-z",
        name: "Zero Budget",
        icon: "circle",
        color: "#999",
        budgetLimit: 0,
        spent: 50,
      },
    ];

    render(<BudgetOverview categories={zeroCategory} currency="USD" />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });
});
