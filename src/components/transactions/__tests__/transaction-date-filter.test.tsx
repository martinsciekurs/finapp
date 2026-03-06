import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

import {
  getDateRangeFromPreset,
  filterByDateRange,
  TransactionDateFilter,
  type DateRange,
} from "../transaction-date-filter";
import type { TransactionData } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function makeTx(overrides: Partial<TransactionData> & { date: string }): TransactionData {
  return {
    id: `tx-${overrides.date}`,
    amount: 100,
    type: "expense",
    description: "Test",
    categoryId: "cat-1",
    categoryName: "General",
    categoryIcon: "circle",
    categoryColor: null,
    attachments: [],
    tags: [],
    ...overrides,
  };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function firstOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function firstOfLastMonth(): string {
  const d = new Date();
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
}

function lastOfLastMonth(): string {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth(), 0);
  return `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, "0")}-${String(last.getDate()).padStart(2, "0")}`;
}

function firstOf3MonthsAgo(): string {
  const d = new Date();
  const past = new Date(d.getFullYear(), d.getMonth() - 2, 1);
  return `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, "0")}-01`;
}

// ────────────────────────────────────────────
// getDateRangeFromPreset
// ────────────────────────────────────────────

describe("getDateRangeFromPreset", () => {
  it("returns null range for 'all'", () => {
    const range = getDateRangeFromPreset("all");
    expect(range.from).toBeNull();
    expect(range.to).toBeNull();
  });

  it("returns first-of-month to today for 'this-month'", () => {
    const range = getDateRangeFromPreset("this-month");
    expect(range.from).toBe(firstOfMonth());
    expect(range.to).toBe(todayStr());
  });

  it("returns correct from/to for 'last-month'", () => {
    const range = getDateRangeFromPreset("last-month");
    expect(range.from).toBe(firstOfLastMonth());
    expect(range.to).toBe(lastOfLastMonth());
  });

  it("returns first-of-3-months-ago to today for 'last-3-months'", () => {
    const range = getDateRangeFromPreset("last-3-months");
    expect(range.from).toBe(firstOf3MonthsAgo());
    expect(range.to).toBe(todayStr());
  });

  it("returns Jan 1 of current year to today for 'this-year'", () => {
    const range = getDateRangeFromPreset("this-year");
    const year = new Date().getFullYear();
    expect(range.from).toBe(`${year}-01-01`);
    expect(range.to).toBe(todayStr());
  });

  it("returns null range for 'custom' (user fills in manually)", () => {
    const range = getDateRangeFromPreset("custom");
    expect(range.from).toBeNull();
    expect(range.to).toBeNull();
  });
});

// ────────────────────────────────────────────
// filterByDateRange
// ────────────────────────────────────────────

describe("filterByDateRange", () => {
  const txList: TransactionData[] = [
    makeTx({ date: "2026-01-10", id: "jan" }),
    makeTx({ date: "2026-02-15", id: "feb" }),
    makeTx({ date: "2026-03-05", id: "mar" }),
    makeTx({ date: "2026-04-20", id: "apr" }),
  ];

  it("returns all when from and to are both null", () => {
    const result = filterByDateRange(txList, { from: null, to: null });
    expect(result).toHaveLength(4);
  });

  it("filters with from only (no upper bound)", () => {
    const result = filterByDateRange(txList, { from: "2026-02-01", to: null });
    expect(result.map((t) => t.id)).toEqual(["feb", "mar", "apr"]);
  });

  it("filters with to only (no lower bound)", () => {
    const result = filterByDateRange(txList, { from: null, to: "2026-02-28" });
    expect(result.map((t) => t.id)).toEqual(["jan", "feb"]);
  });

  it("filters with both from and to", () => {
    const result = filterByDateRange(txList, { from: "2026-02-01", to: "2026-03-31" });
    expect(result.map((t) => t.id)).toEqual(["feb", "mar"]);
  });

  it("is inclusive on both ends", () => {
    const result = filterByDateRange(txList, { from: "2026-02-15", to: "2026-03-05" });
    expect(result.map((t) => t.id)).toEqual(["feb", "mar"]);
  });

  it("returns empty when range matches nothing", () => {
    const result = filterByDateRange(txList, { from: "2027-01-01", to: "2027-12-31" });
    expect(result).toHaveLength(0);
  });
});

// ────────────────────────────────────────────
// TransactionDateFilter component
// ────────────────────────────────────────────

describe("TransactionDateFilter", () => {
  let onChange: ReturnType<typeof vi.fn<(range: DateRange) => void>>;

  beforeEach(() => {
    onChange = vi.fn<(range: DateRange) => void>();
  });

  it("renders with 'All Time' as default label", () => {
    render(
      <TransactionDateFilter
        value={{ from: null, to: null }}
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /all time/i })).toBeInTheDocument();
  });

  it("shows preset options when clicked", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDateFilter
        value={{ from: null, to: null }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all time/i }));

    expect(screen.getByRole("button", { name: /this month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last month/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /last 3 months/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /this year/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /custom range/i })).toBeInTheDocument();
  });

  it("calls onChange with date range when selecting 'This Month'", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDateFilter
        value={{ from: null, to: null }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all time/i }));
    await user.click(screen.getByRole("button", { name: /this month/i }));

    expect(onChange).toHaveBeenCalledWith({
      from: firstOfMonth(),
      to: todayStr(),
    });
  });

  it("calls onChange with null range when selecting 'All Time'", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDateFilter
        value={{ from: firstOfMonth(), to: todayStr() }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /this month/i }));
    await user.click(screen.getByRole("button", { name: /^all time$/i }));

    expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it("shows 'Custom Range' option that reveals date inputs", async () => {
    const user = userEvent.setup();
    render(
      <TransactionDateFilter
        value={{ from: null, to: null }}
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("button", { name: /all time/i }));
    await user.click(screen.getByRole("button", { name: /custom range/i }));

    expect(screen.getByLabelText(/from/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument();
  });

  it("displays current preset label on trigger button", () => {
    render(
      <TransactionDateFilter
        value={{ from: firstOfMonth(), to: todayStr() }}
        onChange={onChange}
      />
    );

    expect(screen.getByRole("button", { name: /this month/i })).toBeInTheDocument();
  });
});
