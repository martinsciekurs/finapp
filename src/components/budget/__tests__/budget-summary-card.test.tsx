import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { BudgetSummary } from "@/lib/types/budget";

vi.mock("@/app/dashboard/budget/actions", () => ({
  upsertIncomeTarget: vi.fn().mockResolvedValue({ success: true }),
}));

import { BudgetSummaryCard } from "../budget-summary-card";

const summary: BudgetSummary = {
  incomeTarget: 5000,
  totalBudgeted: 3000,
  leftToAssign: 2000,
  totalSpent: 1500,
  leftToSpend: 1500,
};

const zeroSummary: BudgetSummary = {
  incomeTarget: 0,
  totalBudgeted: 0,
  leftToAssign: 0,
  totalSpent: 0,
  leftToSpend: 0,
};

describe("BudgetSummaryCard", () => {
  it("renders all five metric labels", () => {
    render(
      <BudgetSummaryCard
        summary={summary}
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

  it("displays formatted income target", () => {
    render(
      <BudgetSummaryCard
        summary={summary}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("shows 'Set target' when income is 0", () => {
    render(
      <BudgetSummaryCard
        summary={zeroSummary}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    expect(screen.getByText("Set target")).toBeInTheDocument();
  });

  it("switches to editing mode when income amount is clicked", async () => {
    const user = userEvent.setup();
    render(
      <BudgetSummaryCard
        summary={summary}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    // Click the income display to enter edit mode
    await user.click(screen.getByText("$5,000"));
    // Should show input and save/cancel buttons
    expect(screen.getByLabelText("Save income target")).toBeInTheDocument();
    expect(screen.getByLabelText("Cancel editing")).toBeInTheDocument();
  });

  it("cancels editing on cancel button click", async () => {
    const user = userEvent.setup();
    render(
      <BudgetSummaryCard
        summary={summary}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    await user.click(screen.getByText("$5,000"));
    await user.click(screen.getByLabelText("Cancel editing"));
    // Should be back to display mode
    expect(screen.getByText("$5,000")).toBeInTheDocument();
  });

  it("applies destructive color to negative Left to Assign", () => {
    const negativeSummary: BudgetSummary = {
      ...summary,
      leftToAssign: -500,
    };
    render(
      <BudgetSummaryCard
        summary={negativeSummary}
        currency="USD"
        yearMonth="2026-03"
      />
    );
    const leftToAssignLabel = screen.getByText("Left to Assign");
    const valueEl = leftToAssignLabel.parentElement?.querySelector(".text-destructive");
    expect(valueEl).toBeTruthy();
  });
});
