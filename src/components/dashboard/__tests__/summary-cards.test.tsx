import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import type { UpcomingRemindersData } from "@/lib/types/reminder";

// Mock framer-motion to render static elements
vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      className,
      ...rest
    }: React.ComponentProps<"div">) => (
      <div className={className} {...rest}>
        {children}
      </div>
    ),
  },
  useReducedMotion: () => true,
}));

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
    totalSpent: 1948.49,
    totalIncome: 3200,
    weeklySpending: 143.49,
    upcomingReminders: makeRemindersData(),
    currency: "USD",
  };

  it("renders three summary cards with correct labels", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Total Spent This Month")).toBeInTheDocument();
    expect(screen.getByText("Weekly Spending")).toBeInTheDocument();
    expect(screen.getByText("Scheduled Payments")).toBeInTheDocument();
  });

  it("renders formatted currency values for spending cards", () => {
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters).toHaveLength(3);
    expect(counters[0].textContent).toBe("$1,948.49");
    expect(counters[1].textContent).toBe("$143.49");
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

  it("renders subtitles for spending cards", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
  });

  it("shows income as subtitle on the first card", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Income: $3,200.00")).toBeInTheDocument();
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
        totalSpent={0}
        totalIncome={0}
        weeklySpending={0}
        upcomingReminders={zeroReminders}
        currency="USD"
      />
    );

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[0].textContent).toBe("$0.00");
    expect(counters[1].textContent).toBe("$0.00");
    expect(counters[2].textContent).toBe("0");
  });

  it("renders period filter dropdown with all options", () => {
    render(<SummaryCards {...defaultProps} />);

    const select = screen.getByRole("combobox", { name: "Filter period" });
    expect(select).toBeInTheDocument();

    const options = Array.from(
      (select as HTMLSelectElement).options
    ).map((o) => o.text);
    expect(options).toEqual(["Next 7 days", "Until end of month"]);
  });

  it("defaults to 7d period in dropdown", () => {
    render(<SummaryCards {...defaultProps} />);

    const select = screen.getByRole("combobox", {
      name: "Filter period",
    }) as HTMLSelectElement;
    expect(select.value).toBe("7d");
  });

  it("switches period and updates count on select change", async () => {
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
