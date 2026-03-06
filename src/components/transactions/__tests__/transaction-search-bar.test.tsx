import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import React from "react";

import {
  filterTransactions,
  TransactionSearchBar,
} from "../transaction-search-bar";
import type { TransactionData } from "@/lib/types/transactions";

const sampleTransactions: TransactionData[] = [
  {
    id: "tx-1",
    amount: 50.0,
    type: "expense",
    description: "Morning Coffee",
    date: "2026-03-04",
    categoryId: "cat-1",
    categoryName: "Food & Drink",
    categoryIcon: "coffee",
    categoryColor: "#8B4513",
    attachments: [],
    tags: [],
  },
  {
    id: "tx-2",
    amount: 150.0,
    type: "expense",
    description: "Weekly shopping",
    date: "2026-03-04",
    categoryId: "cat-2",
    categoryName: "Groceries",
    categoryIcon: "shopping-cart",
    categoryColor: "#4CAF50",
    attachments: [],
    tags: [],
  },
  {
    id: "tx-3",
    amount: 3200.0,
    type: "income",
    description: "Monthly salary",
    date: "2026-03-01",
    categoryId: "cat-3",
    categoryName: "Salary",
    categoryIcon: "briefcase",
    categoryColor: "#2196F3",
    attachments: [],
    tags: [],
  },
];

describe("filterTransactions", () => {
  it("returns all transactions when query is empty string", () => {
    expect(filterTransactions(sampleTransactions, "")).toHaveLength(3);
  });

  it("returns all transactions when query is only whitespace", () => {
    expect(filterTransactions(sampleTransactions, "   ")).toHaveLength(3);
  });

  it("filters by description — case-insensitive substring", () => {
    const result = filterTransactions(sampleTransactions, "coffee");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tx-1");
  });

  it("filters by description — upper-case query matches lower-case text", () => {
    const result = filterTransactions(sampleTransactions, "MORNING");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tx-1");
  });

  it("filters by category name — case-insensitive substring", () => {
    const result = filterTransactions(sampleTransactions, "groc");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tx-2");
  });

  it("filters by formatted amount — exact amount match", () => {
    const result = filterTransactions(sampleTransactions, "$50.00", "USD");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("tx-1");
  });

  it("filters by formatted amount — '50' matches $50.00 and $150.00", () => {
    const result = filterTransactions(sampleTransactions, "50", "USD");
    expect(result).toHaveLength(2);
    const ids = result.map((tx) => tx.id);
    expect(ids).toContain("tx-1");
    expect(ids).toContain("tx-2");
  });

  it("returns empty array when nothing matches", () => {
    const result = filterTransactions(sampleTransactions, "xyznotfound");
    expect(result).toHaveLength(0);
  });

  it("returns empty array when input list is empty", () => {
    expect(filterTransactions([], "coffee")).toHaveLength(0);
  });
});

describe("TransactionSearchBar", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders input with placeholder 'Search transactions...'", () => {
    render(<TransactionSearchBar value="" onChange={vi.fn()} />);
    expect(
      screen.getByPlaceholderText("Search transactions...")
    ).toBeInTheDocument();
  });

  it("renders a Search icon (SVG) in the wrapper", () => {
    const { container } = render(
      <TransactionSearchBar value="" onChange={vi.fn()} />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT show clear button when input is empty", () => {
    render(<TransactionSearchBar value="" onChange={vi.fn()} />);
    expect(
      screen.queryByRole("button", { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it("shows clear button (X) when input has a value", () => {
    render(<TransactionSearchBar value="" onChange={vi.fn()} />);

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Search transactions..."), {
        target: { value: "coffee" },
      });
    });

    expect(
      screen.getByRole("button", { name: /clear search/i })
    ).toBeInTheDocument();
  });

  it("calls onChange callback with typed value after 300ms debounce", () => {
    const onChange = vi.fn();
    render(<TransactionSearchBar value="" onChange={onChange} />);

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Search transactions..."), {
        target: { value: "coffee" },
      });
    });

    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledWith("coffee");
  });

  it("clicking X clears the input and calls onChange with empty string immediately", () => {
    const onChange = vi.fn();
    render(<TransactionSearchBar value="" onChange={onChange} />);

    act(() => {
      fireEvent.change(screen.getByPlaceholderText("Search transactions..."), {
        target: { value: "coffee" },
      });
    });

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /clear search/i }));
    });

    expect(
      screen.getByPlaceholderText("Search transactions...")
    ).toHaveValue("");
    expect(onChange).toHaveBeenCalledWith("");
    expect(
      screen.queryByRole("button", { name: /clear search/i })
    ).not.toBeInTheDocument();
  });

  it("syncs external value prop to the input", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <TransactionSearchBar value="" onChange={onChange} />
    );

    rerender(<TransactionSearchBar value="salary" onChange={onChange} />);

    expect(
      screen.getByPlaceholderText("Search transactions...")
    ).toHaveValue("salary");
  });
});
