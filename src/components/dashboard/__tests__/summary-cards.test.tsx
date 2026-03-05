import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { UpcomingRemindersData } from "@/lib/types/reminder";

// Shared mock
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

// Mock AnimatedCounter to render the formatted value directly
vi.mock("../animated-counter", () => ({
  AnimatedCounter: ({
    value,
    formatValue,
    className,
  }: {
    value: number;
    formatValue: (n: number) => string;
    className?: string;
  }) => (
    <span className={className} data-testid="animated-counter">
      {formatValue(value)}
    </span>
  ),
}));

import { SummaryCards } from "../summary-cards";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function makeRemindersData(
  overrides: Partial<UpcomingRemindersData> = {}
): UpcomingRemindersData {
  return {
    byPeriod: {
      "7d": { count: 1 },
      end_of_month: { count: 2 },
    },
    overdueCount: 0,
    ...overrides,
  };
}

describe("SummaryCards", () => {
  const defaultProps = {
    income: { month: 3200, "7d": 800 },
    spending: { month: 1948.49, "7d": 143.49 },
    upcomingReminders: makeRemindersData(),
    currency: "USD",
  };

  it("renders three summary cards with correct labels", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByText("Spending")).toBeInTheDocument();
    expect(screen.getByText("Scheduled Payments")).toBeInTheDocument();
  });

  it("renders formatted currency values (monthly by default)", () => {
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters).toHaveLength(3);
    // Income card (month) first
    expect(counters[0].textContent).toBe("$3,200.00");
    // Spending card (month) second
    expect(counters[1].textContent).toBe("$1,948.49");
  });

  it("renders reminder count for the default period (7d) + overdue", () => {
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    // 7d (1) + overdue (0) = 1
    expect(counters[2].textContent).toBe("1");
  });

  it("includes overdue count in the total", () => {
    render(
      <SummaryCards
        {...defaultProps}
        upcomingReminders={makeRemindersData({ overdueCount: 2 })}
      />
    );

    const counters = screen.getAllByTestId("animated-counter");
    // 7d (1) + overdue (2) = 3
    expect(counters[2].textContent).toBe("3");
  });

  it("renders period selectors for income and spending cards", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(
      screen.getByRole("combobox", { name: "Income period" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Spending period" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Filter period" })
    ).toBeInTheDocument();
  });

  it("renders with EUR currency", () => {
    render(<SummaryCards {...defaultProps} currency="EUR" />);

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[0].textContent).toContain("€");
    expect(counters[1].textContent).toContain("€");
  });

  it("has accessible region with label", () => {
    render(<SummaryCards {...defaultProps} />);

    const region = screen.getByRole("region", { name: "Financial summary" });
    expect(region).toBeInTheDocument();
  });

  it("renders zero values correctly", () => {
    const zeroReminders = makeRemindersData({
      byPeriod: {
        "7d": { count: 0 },
        end_of_month: { count: 0 },
      },
    });
    render(
      <SummaryCards
        income={{ month: 0, "7d": 0 }}
        spending={{ month: 0, "7d": 0 }}
        upcomingReminders={zeroReminders}
        currency="USD"
      />
    );

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[0].textContent).toBe("$0.00");
    expect(counters[1].textContent).toBe("$0.00");
    expect(counters[2].textContent).toBe("0");
  });

  it("renders income/spending period options", () => {
    render(<SummaryCards {...defaultProps} />);

    const incomeSelect = screen.getByRole("combobox", {
      name: "Income period",
    }) as HTMLSelectElement;
    const options = Array.from(incomeSelect.options).map((o) => o.text);
    expect(options).toEqual(["This month", "Last 7 days"]);
  });

  it("renders reminder period options", () => {
    render(<SummaryCards {...defaultProps} />);

    const select = screen.getByRole("combobox", {
      name: "Filter period",
    }) as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.text);
    expect(options).toEqual(["Next 7 days", "Until end of month"]);
  });

  it("defaults to monthly period for income and spending", () => {
    render(<SummaryCards {...defaultProps} />);

    const incomeSelect = screen.getByRole("combobox", {
      name: "Income period",
    }) as HTMLSelectElement;
    const spendingSelect = screen.getByRole("combobox", {
      name: "Spending period",
    }) as HTMLSelectElement;

    expect(incomeSelect.value).toBe("month");
    expect(spendingSelect.value).toBe("month");
  });

  it("switches income period and updates value", async () => {
    const user = userEvent.setup();
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    // Default is month → $3,200.00
    expect(counters[0].textContent).toBe("$3,200.00");

    // Switch to "Last 7 days" → $800.00
    const incomeSelect = screen.getByRole("combobox", {
      name: "Income period",
    });
    await user.selectOptions(incomeSelect, "7d");
    const updated = screen.getAllByTestId("animated-counter");
    expect(updated[0].textContent).toBe("$800.00");
  });

  it("switches spending period and updates value", async () => {
    const user = userEvent.setup();
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    // Default is month → $1,948.49
    expect(counters[1].textContent).toBe("$1,948.49");

    // Switch to "Last 7 days" → $143.49
    const spendingSelect = screen.getByRole("combobox", {
      name: "Spending period",
    });
    await user.selectOptions(spendingSelect, "7d");
    const updated = screen.getAllByTestId("animated-counter");
    expect(updated[1].textContent).toBe("$143.49");
  });

  it("switches reminder period and updates count", async () => {
    const user = userEvent.setup();
    render(<SummaryCards {...defaultProps} />);

    // Default is 7d → count 1
    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[2].textContent).toBe("1");

    // Change to "Until end of month" → count 2
    const select = screen.getByRole("combobox", { name: "Filter period" });
    await user.selectOptions(select, "end_of_month");
    const updated = screen.getAllByTestId("animated-counter");
    expect(updated[2].textContent).toBe("2");
  });
});
