import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

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
  useReducedMotion: () => true, // Always reduced motion in tests for deterministic output
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

describe("SummaryCards", () => {
  const defaultProps = {
    totalSpent: 1948.49,
    totalIncome: 3200,
    weeklySpending: 143.49,
    upcomingReminders: 3,
    currency: "USD",
  };

  it("renders three summary cards with correct labels", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Total Spent This Month")).toBeInTheDocument();
    expect(screen.getByText("Weekly Spending")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Reminders")).toBeInTheDocument();
  });

  it("renders formatted currency values for spending cards", () => {
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters).toHaveLength(3);
    expect(counters[0].textContent).toBe("$1,948.49");
    expect(counters[1].textContent).toBe("$143.49");
  });

  it("renders reminder count as a number", () => {
    render(<SummaryCards {...defaultProps} />);

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[2].textContent).toBe("3");
  });

  it("renders subtitles", () => {
    render(<SummaryCards {...defaultProps} />);

    expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    expect(screen.getByText("Bills & scheduled payments")).toBeInTheDocument();
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
    render(
      <SummaryCards
        totalSpent={0}
        totalIncome={0}
        weeklySpending={0}
        upcomingReminders={0}
        currency="USD"
      />
    );

    const counters = screen.getAllByTestId("animated-counter");
    expect(counters[0].textContent).toBe("$0.00");
    expect(counters[1].textContent).toBe("$0.00");
    expect(counters[2].textContent).toBe("0");
  });
});
