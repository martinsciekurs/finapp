import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock getCurrentYearMonth to return a stable value
vi.mock("@/lib/utils/date", () => ({
  getCurrentYearMonth: () => "2026-03",
}));

import { PeriodSelector } from "../period-selector";

describe("PeriodSelector", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it("renders month label", () => {
    render(<PeriodSelector currentMonth="2026-03" />);
    expect(screen.getByText("March 2026")).toBeInTheDocument();
  });

  it("renders navigation buttons", () => {
    render(<PeriodSelector currentMonth="2026-03" />);
    expect(screen.getByLabelText("Previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Next month")).toBeInTheDocument();
  });

  it("renders This Month and Last Month preset buttons", () => {
    render(<PeriodSelector currentMonth="2026-03" />);
    expect(screen.getByText("This Month")).toBeInTheDocument();
    expect(screen.getByText("Last Month")).toBeInTheDocument();
  });

  it("navigates to previous month on click", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector currentMonth="2026-03" />);
    await user.click(screen.getByLabelText("Previous month"));
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("month=2026-02")
    );
  });

  it("navigates to next month on click", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector currentMonth="2026-03" />);
    await user.click(screen.getByLabelText("Next month"));
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("month=2026-04")
    );
  });

  it("navigates to current month (removes month param) on This Month click", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector currentMonth="2026-01" />);
    await user.click(screen.getByText("This Month"));
    // Current month is 2026-03, so navigating to it should strip the month param
    expect(pushMock).toHaveBeenCalledWith("/dashboard/budget");
  });

  it("navigates to last month on Last Month click", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector currentMonth="2026-03" />);
    await user.click(screen.getByText("Last Month"));
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("month=2026-02")
    );
  });

  it("wraps around year boundary for December → January", () => {
    render(<PeriodSelector currentMonth="2026-12" />);
    expect(screen.getByText("December 2026")).toBeInTheDocument();
  });

  it("wraps around year boundary for January → December", async () => {
    const user = userEvent.setup();
    render(<PeriodSelector currentMonth="2026-01" />);
    await user.click(screen.getByLabelText("Previous month"));
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("month=2025-12")
    );
  });
});
