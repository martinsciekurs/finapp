import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Mock framer-motion
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

// Mock CategoryIcon
vi.mock("@/components/ui/category-icon", () => ({
  CategoryIcon: ({
    name,
    "aria-label": label,
  }: {
    name: string;
    "aria-label"?: string;
  }) => (
    <span data-testid="category-icon" aria-label={label}>
      {name}
    </span>
  ),
}));

// Mock server action
const mockDeleteTransaction = vi.fn();
vi.mock("@/app/dashboard/transactions/actions", () => ({
  deleteTransaction: (...args: unknown[]) => mockDeleteTransaction(...args),
}));

// Mock sonner
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();
vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { TransactionList } from "../transaction-list";
import type { TransactionData } from "@/lib/types/transactions";

const sampleTransactions: TransactionData[] = [
  {
    id: "tx-1",
    amount: 42.5,
    type: "expense",
    description: "Grocery shopping",
    date: "2026-03-04",
    categoryId: "cat-1",
    categoryName: "Groceries",
    categoryIcon: "shopping-cart",
    categoryColor: "#4CAF50",
  },
  {
    id: "tx-2",
    amount: 3200,
    type: "income",
    description: "Monthly salary",
    date: "2026-03-04",
    categoryId: "cat-2",
    categoryName: "Salary",
    categoryIcon: "briefcase",
    categoryColor: "#2196F3",
  },
  {
    id: "tx-3",
    amount: 15.99,
    type: "expense",
    description: "Netflix subscription",
    date: "2026-03-02",
    categoryId: "cat-3",
    categoryName: "Entertainment",
    categoryIcon: "film",
    categoryColor: "#FF5722",
  },
];

describe("TransactionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all transaction descriptions", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
  });

  it("renders category names", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("renders formatted amounts with correct signs", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    // Expense amounts have a minus sign
    expect(
      screen.getByText((_, el) =>
        (el?.tagName === "P" && el.textContent?.includes("-$42.50")) || false
      )
    ).toBeInTheDocument();

    // Income amounts have a plus sign
    expect(
      screen.getByText(
        (_, el) =>
          (el?.tagName === "P" && el.textContent?.includes("+$3,200.00")) ||
          false
      )
    ).toBeInTheDocument();
  });

  it("groups transactions by date", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    // Should have 2 date groups: Mar 4 and Mar 2
    const dateHeaders = screen.getAllByRole("heading", { level: 3 });
    expect(dateHeaders).toHaveLength(2);
  });

  it("shows filter tabs (all, expense, income)", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("expense")).toBeInTheDocument();
    expect(screen.getByText("income")).toBeInTheDocument();
  });

  it("filters by expense type", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    await user.click(screen.getByText("expense"));

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
    expect(screen.queryByText("Monthly salary")).not.toBeInTheDocument();
  });

  it("filters by income type", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    await user.click(screen.getByText("income"));

    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.queryByText("Grocery shopping")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Netflix subscription")
    ).not.toBeInTheDocument();
  });

  it("shows all transactions when all filter is selected", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    // First filter to expense, then back to all
    await user.click(screen.getByText("expense"));
    await user.click(screen.getByText("all"));

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
  });

  it("shows empty state when no transactions exist", () => {
    render(<TransactionList transactions={[]} currency="USD" />);

    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add your first transaction using the form above."
      )
    ).toBeInTheDocument();
  });

  it("shows filtered empty state when no matching transactions", async () => {
    const user = userEvent.setup();
    const expenseOnly: TransactionData[] = [
      {
        id: "tx-1",
        amount: 42.5,
        type: "expense",
        description: "Grocery shopping",
        date: "2026-03-04",
        categoryId: "cat-1",
        categoryName: "Groceries",
        categoryIcon: "shopping-cart",
        categoryColor: "#4CAF50",
      },
    ];

    render(<TransactionList transactions={expenseOnly} currency="USD" />);

    await user.click(screen.getByText("income"));

    expect(
      screen.getByText("No income transactions")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "No income transactions found. Try changing the filter."
      )
    ).toBeInTheDocument();
  });

  it("renders delete buttons for each transaction", () => {
    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete transaction/i,
    });
    expect(deleteButtons).toHaveLength(3);
  });

  it("calls deleteTransaction when delete button is clicked", async () => {
    const user = userEvent.setup();
    mockDeleteTransaction.mockResolvedValue({ success: true });

    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete transaction/i,
    });
    await user.click(deleteButtons[0]);

    expect(mockDeleteTransaction).toHaveBeenCalledWith("tx-1");
  });

  it("shows success toast on successful delete", async () => {
    const user = userEvent.setup();
    mockDeleteTransaction.mockResolvedValue({ success: true });

    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete transaction/i,
    });
    await user.click(deleteButtons[0]);

    expect(mockToastSuccess).toHaveBeenCalledWith("Transaction deleted");
  });

  it("shows error toast on failed delete", async () => {
    const user = userEvent.setup();
    mockDeleteTransaction.mockResolvedValue({
      success: false,
      error: "Failed to delete transaction",
    });

    render(
      <TransactionList transactions={sampleTransactions} currency="USD" />
    );

    const deleteButtons = screen.getAllByRole("button", {
      name: /delete transaction/i,
    });
    await user.click(deleteButtons[0]);

    expect(mockToastError).toHaveBeenCalledWith(
      "Failed to delete transaction"
    );
  });

  it("renders with EUR currency", () => {
    render(
      <TransactionList
        transactions={[sampleTransactions[0]]}
        currency="EUR"
      />
    );

    expect(
      screen.getByText(
        (_, el) =>
          (el?.tagName === "P" && el.textContent?.includes("€42.50")) || false
      )
    ).toBeInTheDocument();
  });

  it("shows 'No description' for transactions without description", () => {
    const noDescTx: TransactionData[] = [
      {
        id: "tx-empty",
        amount: 10,
        type: "expense",
        description: "",
        date: "2026-03-04",
        categoryId: "cat-1",
        categoryName: "Groceries",
        categoryIcon: "shopping-cart",
        categoryColor: "#4CAF50",
      },
    ];

    render(<TransactionList transactions={noDescTx} currency="USD" />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });
});
