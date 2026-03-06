import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { BudgetCategoryItem, UnbudgetedCategoryItem } from "@/lib/types/budget";

vi.mock("@/app/dashboard/budget/actions", () => ({
  upsertCategoryBudget: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));

import { BudgetedCategoryRow, UnbudgetedCategoryRow } from "../budget-category-row";

const budgetedItem: BudgetCategoryItem = {
  id: "b1",
  categoryId: "c1",
  name: "Groceries",
  icon: "shopping-cart",
  color: "#4CAF50",
  groupId: "g1",
  groupName: "Essentials",
  budgeted: 500,
  spent: 350,
};

const unbudgetedItem: UnbudgetedCategoryItem = {
  categoryId: "c2",
  name: "Coffee",
  icon: "coffee",
  color: "#FF5722",
  groupId: "g1",
  groupName: "Essentials",
  spent: 45,
};

describe("BudgetedCategoryRow", () => {
  it("renders category name and icon", () => {
    render(
      <BudgetedCategoryRow item={budgetedItem} currency="USD" yearMonth="2026-03" />
    );
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByTestId("category-icon")).toBeInTheDocument();
  });

  it("renders progress bar with correct percentage", () => {
    render(
      <BudgetedCategoryRow item={budgetedItem} currency="USD" yearMonth="2026-03" />
    );
    // 350/500 = 70%
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "70");
    expect(progressBar).toHaveAttribute("aria-label", "Groceries budget: 70% used");
  });

  it("shows destructive color when over budget", () => {
    const overBudgetItem = { ...budgetedItem, spent: 600 };
    const { container } = render(
      <BudgetedCategoryRow item={overBudgetItem} currency="USD" yearMonth="2026-03" />
    );
    // 600/500 = 120%, should use bg-destructive
    const bar = container.querySelector(".bg-destructive");
    expect(bar).toBeTruthy();
  });

  it("shows warning color when 80-99% used", () => {
    const nearBudgetItem = { ...budgetedItem, spent: 450 };
    const { container } = render(
      <BudgetedCategoryRow item={nearBudgetItem} currency="USD" yearMonth="2026-03" />
    );
    // 450/500 = 90%, should use bg-warning
    const bar = container.querySelector(".bg-warning");
    expect(bar).toBeTruthy();
  });

  it("enters edit mode on budget amount click", async () => {
    const user = userEvent.setup();
    render(
      <BudgetedCategoryRow item={budgetedItem} currency="USD" yearMonth="2026-03" />
    );
    // Click the formatted budget amount to enter edit mode
    await user.click(screen.getByText("$500"));
    expect(screen.getByLabelText("Save budget")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel")).toBeInTheDocument();
  });

  it("cancels editing on Cancel click", async () => {
    const user = userEvent.setup();
    render(
      <BudgetedCategoryRow item={budgetedItem} currency="USD" yearMonth="2026-03" />
    );
    await user.click(screen.getByText("$500"));
    await user.click(screen.getByLabelText("Cancel"));
    // Back to display mode
    expect(screen.getByText("$500")).toBeInTheDocument();
  });

  it("clamps progress bar at 100% visually", () => {
    const overBudgetItem = { ...budgetedItem, spent: 800 };
    render(
      <BudgetedCategoryRow item={overBudgetItem} currency="USD" yearMonth="2026-03" />
    );
    // aria-valuenow should be clamped to 100
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "100");
  });
});

describe("UnbudgetedCategoryRow", () => {
  it("renders category name and spent amount", () => {
    render(
      <UnbudgetedCategoryRow item={unbudgetedItem} currency="USD" yearMonth="2026-03" />
    );
    expect(screen.getByText("Coffee")).toBeInTheDocument();
    expect(screen.getByText(/\$45.*spent/)).toBeInTheDocument();
  });

  it("renders Set budget button", () => {
    render(
      <UnbudgetedCategoryRow item={unbudgetedItem} currency="USD" yearMonth="2026-03" />
    );
    expect(screen.getByText("Set budget")).toBeInTheDocument();
  });

  it("enters edit mode on Set budget click", async () => {
    const user = userEvent.setup();
    render(
      <UnbudgetedCategoryRow item={unbudgetedItem} currency="USD" yearMonth="2026-03" />
    );
    await user.click(screen.getByText("Set budget"));
    expect(screen.getByLabelText("Save budget")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel")).toBeInTheDocument();
  });

  it("cancels editing on Cancel click", async () => {
    const user = userEvent.setup();
    render(
      <UnbudgetedCategoryRow item={unbudgetedItem} currency="USD" yearMonth="2026-03" />
    );
    await user.click(screen.getByText("Set budget"));
    await user.click(screen.getByLabelText("Cancel"));
    expect(screen.getByText("Set budget")).toBeInTheDocument();
  });

  it("renders category icon", () => {
    render(
      <UnbudgetedCategoryRow item={unbudgetedItem} currency="USD" yearMonth="2026-03" />
    );
    expect(screen.getByTestId("category-icon")).toBeInTheDocument();
  });
});
