import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// Shared mocks
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));
vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));
vi.mock("@/components/attachments/attachments", () => ({
  Attachments: () => <div data-testid="attachments" />,
}));

// Mock edit dialog
const mockEditDialog = vi.fn();
vi.mock("../edit-transaction-dialog", () => ({
  EditTransactionDialog: (props: Record<string, unknown>) => {
    mockEditDialog(props);
    return props.open ? <div data-testid="edit-dialog">Edit Dialog</div> : null;
  },
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
import type {
  CategoryOption,
  TransactionData,
} from "@/lib/types/transactions";

const sampleCategories: CategoryOption[] = [
  {
    id: "cat-1",
    name: "Groceries",
    icon: "shopping-cart",
    color: "#4CAF50",
    type: "expense",
    group_id: null,
    group_name: null,
  },
  {
    id: "cat-2",
    name: "Salary",
    icon: "briefcase",
    color: "#2196F3",
    type: "income",
    group_id: null,
    group_name: null,
  },
  {
    id: "cat-3",
    name: "Entertainment",
    icon: "film",
    color: "#FF5722",
    type: "expense",
    group_id: null,
    group_name: null,
  },
];

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
    attachments: [],
    tags: [],
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
    attachments: [],
    tags: [],
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
    attachments: [],
    tags: [],
  },
];

describe("TransactionList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all transaction descriptions", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
  });

  it("renders category names", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("renders formatted amounts with correct signs", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    // Should have 2 date groups: Mar 4 and Mar 2
    const dateHeaders = screen.getAllByRole("heading", { level: 3 });
    expect(dateHeaders).toHaveLength(2);
  });

  it("shows filter tabs (all, expense, income)", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    expect(screen.getByText("all")).toBeInTheDocument();
    expect(screen.getByText("expense")).toBeInTheDocument();
    expect(screen.getByText("income")).toBeInTheDocument();
  });

  it("filters by expense type", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    await user.click(screen.getByText("expense"));

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
    expect(screen.queryByText("Monthly salary")).not.toBeInTheDocument();
  });

  it("filters by income type", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    // First filter to expense, then back to all
    await user.click(screen.getByText("expense"));
    await user.click(screen.getByText("all"));

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
  });

  it("shows empty state when no transactions exist", () => {
    render(<TransactionList transactions={[]} categories={sampleCategories} currency="USD" userTags={[]} />);

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
        attachments: [],
        tags: [],
      },
    ];

    render(<TransactionList transactions={expenseOnly} categories={sampleCategories} currency="USD" userTags={[]} />);

    await user.click(screen.getByText("income"));

    expect(
      screen.getByText("No matching transactions")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Try adjusting your search or filters."
      )
    ).toBeInTheDocument();
  });

  it("renders delete buttons for each transaction", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
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
        categories={sampleCategories}
        currency="EUR"
        userTags={[]}
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
        attachments: [],
        tags: [],
      },
    ];

    render(<TransactionList transactions={noDescTx} categories={sampleCategories} currency="USD" userTags={[]} />);
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("renders edit buttons for each transaction", () => {
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    const editButtons = screen.getAllByRole("button", {
      name: /edit transaction/i,
    });
    expect(editButtons).toHaveLength(3);
  });

  it("opens edit dialog when edit button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <TransactionList transactions={sampleTransactions} categories={sampleCategories} currency="USD" userTags={[]} />
    );

    // No dialog initially
    expect(screen.queryByTestId("edit-dialog")).not.toBeInTheDocument();

    const editButtons = screen.getAllByRole("button", {
      name: /edit transaction/i,
    });
    await user.click(editButtons[0]);

    // Dialog should now be rendered
    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });
});
