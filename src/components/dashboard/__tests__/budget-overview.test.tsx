import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type {
  BudgetCategoryData,
  BudgetOverviewData,
} from "@/lib/types/dashboard";

// Shared mocks
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));
vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { BudgetOverview } from "../budget-overview";

// ────────────────────────────────────────────
// Test data helpers
// ────────────────────────────────────────────

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

function buildData(
  overrides: Partial<BudgetOverviewData> = {}
): BudgetOverviewData {
  return {
    incomeTarget: 0,
    totalBudgeted: 850,
    budgetedCategories: sampleCategories,
    unbudgetedCategories: [],
    ...overrides,
  };
}

// ────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────

describe("BudgetOverview", () => {
  it("renders category names", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transportation")).toBeInTheDocument();
    expect(screen.getByText("Dining Out")).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

    const icons = screen.getAllByTestId("category-icon");
    expect(icons).toHaveLength(3);
    expect(icons[0]).toHaveTextContent("shopping-cart");
    expect(icons[1]).toHaveTextContent("car");
    expect(icons[2]).toHaveTextContent("utensils");
  });

  it("renders Budget Overview heading", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

    expect(screen.getByText("Budget Overview")).toBeInTheDocument();
  });

  it("renders a top-right link to budget page", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

    const link = screen.getByRole("link", { name: "View budget" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/budget");
  });

  it("renders formatted spent/budget amounts", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

    expect(screen.getByText("$350.00")).toBeInTheDocument();
    expect(screen.getByText("$500.00")).toBeInTheDocument();
  });

  it("renders progress bars with correct aria attributes", () => {
    render(<BudgetOverview data={buildData()} currency="USD" />);

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
    render(<BudgetOverview data={buildData()} currency="USD" />);

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

  it("shows empty state when no categories have budgets and no unbudgeted spending", () => {
    render(
      <BudgetOverview
        data={buildData({
          budgetedCategories: [],
          unbudgetedCategories: [],
          totalBudgeted: 0,
        })}
        currency="USD"
      />
    );

    expect(screen.getByText("No budgets set")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Set budget limits on your expense categories to track your spending here."
      )
    ).toBeInTheDocument();
  });

  it("does not render card when empty", () => {
    render(
      <BudgetOverview
        data={buildData({
          budgetedCategories: [],
          unbudgetedCategories: [],
          totalBudgeted: 0,
        })}
        currency="USD"
      />
    );

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

    render(
      <BudgetOverview
        data={buildData({ budgetedCategories: zeroCategory, totalBudgeted: 0 })}
        currency="USD"
      />
    );
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "0");
  });

  // ──────────────────────────────────────────
  // Allocation summary
  // ──────────────────────────────────────────

  it("shows compact allocation summary when income target is set", () => {
    render(
      <BudgetOverview
        data={buildData({ incomeTarget: 2000, totalBudgeted: 850 })}
        currency="USD"
      />
    );

    // Compact summary in CardDescription: "$850.00 of $2,000.00 budgeted | $1,150.00 left to allocate"
    const description = screen.getByText((_content, element) => {
      return (
        element?.getAttribute("data-slot") === "card-description" &&
        element.textContent?.includes("$850.00") === true &&
        element.textContent?.includes("$2,000.00") === true &&
        element.textContent?.includes("left to allocate") === true
      );
    });
    expect(description).toBeInTheDocument();
  });

  it("hides allocation summary when income target is zero", () => {
    render(
      <BudgetOverview
        data={buildData({ incomeTarget: 0 })}
        currency="USD"
      />
    );

    expect(screen.queryByText("left to allocate")).not.toBeInTheDocument();
    expect(screen.queryByText("over-allocated")).not.toBeInTheDocument();
  });

  it("shows over-allocated state when budgeted exceeds income target", () => {
    render(
      <BudgetOverview
        data={buildData({ incomeTarget: 500, totalBudgeted: 850 })}
        currency="USD"
      />
    );

    // Compact summary shows "over-allocated" text with the amount
    const description = screen.getByText((_content, element) => {
      return (
        element?.getAttribute("data-slot") === "card-description" &&
        element.textContent?.includes("over-allocated") === true &&
        element.textContent?.includes("$350.00") === true
      );
    });
    expect(description).toBeInTheDocument();
  });

  it("does not render allocation progress bar (compact design)", () => {
    render(
      <BudgetOverview
        data={buildData({ incomeTarget: 2000, totalBudgeted: 850 })}
        currency="USD"
      />
    );

    // Only category progress bars, no allocation bar
    const progressBars = screen.getAllByRole("progressbar");
    expect(progressBars).toHaveLength(3);
  });

  // ──────────────────────────────────────────
  // Unbudgeted spending
  // ──────────────────────────────────────────

  it("renders unbudgeted spending section", () => {
    render(
      <BudgetOverview
        data={buildData({
          unbudgetedCategories: [
            {
              id: "unb-1",
              name: "Entertainment",
              icon: "gamepad-2",
              color: "#9C27B0",
              spent: 45,
            },
            {
              id: "unb-2",
              name: "Shopping",
              icon: "shopping-bag",
              color: "#E91E63",
              spent: 120,
            },
          ],
        })}
        currency="USD"
      />
    );

    expect(screen.getByText("Not Budgeted")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
  });

  it("hides unbudgeted section when there are no unbudgeted categories", () => {
    render(
      <BudgetOverview
        data={buildData({ unbudgetedCategories: [] })}
        currency="USD"
      />
    );

    expect(screen.queryByText("Not Budgeted")).not.toBeInTheDocument();
  });

  it("shows card with only unbudgeted categories (no budgeted)", () => {
    render(
      <BudgetOverview
        data={buildData({
          budgetedCategories: [],
          totalBudgeted: 0,
          unbudgetedCategories: [
            {
              id: "unb-1",
              name: "Coffee",
              icon: "coffee",
              color: "#795548",
              spent: 25,
            },
          ],
        })}
        currency="USD"
      />
    );

    expect(screen.getByText("Budget Overview")).toBeInTheDocument();
    expect(screen.getByText("Not Budgeted")).toBeInTheDocument();
    expect(screen.getByText("Coffee")).toBeInTheDocument();
  });
});
