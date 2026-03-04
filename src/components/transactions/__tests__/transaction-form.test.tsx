import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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

// Module-level ref for threading Select's onValueChange to SelectItem
let _selectOnValueChange: ((v: string) => void) | undefined;

// Mock Radix Select — Radix portals don't work in jsdom.
// We thread onValueChange via a module-level ref so SelectItem can trigger it.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => {
    // Synchronous assignment during render — no useEffect needed
    _selectOnValueChange = onValueChange;
    return <div data-testid="mock-select">{children}</div>;
  },
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: () => null,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <button
      type="button"
      role="option"
      aria-selected={false}
      onClick={() => _selectOnValueChange?.(value)}
      data-value={value}
    >
      {children}
    </button>
  ),
}));

// Mock the server action
const mockCreateTransaction = vi.fn();
vi.mock("@/app/dashboard/transactions/actions", () => ({
  createTransaction: (...args: unknown[]) => mockCreateTransaction(...args),
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

// Mock date utility to return a fixed date
vi.mock("@/lib/utils/date", () => ({
  formatDateForInput: () => "2026-03-04",
}));

import { TransactionForm } from "../transaction-form";
import type { CategoryOption } from "@/lib/types/transactions";

// UUIDs must be valid — Zod's .uuid() validator rejects non-UUID strings
const sampleCategories: CategoryOption[] = [
  {
    id: "550e8400-e29b-41d4-a716-446655440001",
    name: "Groceries",
    icon: "shopping-cart",
    color: "#4CAF50",
    type: "expense",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440002",
    name: "Transport",
    icon: "car",
    color: "#2196F3",
    type: "expense",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440003",
    name: "Salary",
    icon: "briefcase",
    color: "#FF9800",
    type: "income",
  },
  {
    id: "550e8400-e29b-41d4-a716-446655440004",
    name: "Freelance",
    icon: "laptop",
    color: "#9C27B0",
    type: "income",
  },
];

/** Helper: fill the form and select a category */
async function fillForm(
  user: ReturnType<typeof userEvent.setup>,
  overrides: {
    amount?: string;
    category?: RegExp;
    description?: string;
  } = {}
) {
  const { amount = "42.50", category = /groceries/i, description = "" } = overrides;

  await user.type(screen.getByLabelText("Amount"), amount);
  await user.click(screen.getByRole("option", { name: category }));
  if (description) {
    await user.type(screen.getByLabelText("Description"), description);
  }
}

describe("TransactionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _selectOnValueChange = undefined;
  });

  it("renders the form with all fields", () => {
    render(<TransactionForm categories={sampleCategories} />);

    expect(screen.getByText("Expense")).toBeInTheDocument();
    expect(screen.getByText("Income")).toBeInTheDocument();
    expect(screen.getByLabelText("Amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /add expense/i })
    ).toBeInTheDocument();
  });

  it("defaults to expense type", () => {
    render(<TransactionForm categories={sampleCategories} />);

    const expenseToggle = screen.getByRole("radio", { name: "Expense" });
    expect(expenseToggle).toHaveAttribute("aria-checked", "true");

    const incomeToggle = screen.getByRole("radio", { name: "Income" });
    expect(incomeToggle).toHaveAttribute("aria-checked", "false");
  });

  it("toggles between expense and income type", async () => {
    const user = userEvent.setup();
    render(<TransactionForm categories={sampleCategories} />);

    const incomeToggle = screen.getByRole("radio", { name: "Income" });
    await user.click(incomeToggle);

    expect(incomeToggle).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("button", { name: /add income/i })
    ).toBeInTheDocument();
  });

  it("renders the type toggle as a radiogroup", () => {
    render(<TransactionForm categories={sampleCategories} />);

    const radiogroup = screen.getByRole("radiogroup", {
      name: "Transaction type",
    });
    expect(radiogroup).toBeInTheDocument();
  });

  it("sets today's date as default", () => {
    render(<TransactionForm categories={sampleCategories} />);

    const dateInput = screen.getByLabelText("Date");
    expect(dateInput).toHaveValue("2026-03-04");
  });

  it("shows validation error for empty amount on submit", async () => {
    const user = userEvent.setup();
    render(<TransactionForm categories={sampleCategories} />);

    const submitButton = screen.getByRole("button", { name: /add expense/i });
    await user.click(submitButton);

    await waitFor(() => {
      const amountInput = screen.getByLabelText("Amount");
      expect(amountInput).toHaveAttribute("aria-invalid", "true");
    });
  });

  it("renders expense category options", () => {
    render(<TransactionForm categories={sampleCategories} />);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(2); // 2 expense categories
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();
  });

  it("switches category options when type changes", async () => {
    const user = userEvent.setup();
    render(<TransactionForm categories={sampleCategories} />);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Transport")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Income" }));

    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Freelance")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();
    expect(screen.queryByText("Transport")).not.toBeInTheDocument();
  });

  it("calls createTransaction with correct values on submit", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue({
      success: true,
      data: { id: "new-tx-id" },
    });

    render(<TransactionForm categories={sampleCategories} />);

    await fillForm(user, { amount: "42.50", description: "Weekly groceries" });
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(mockCreateTransaction).toHaveBeenCalledWith({
        category_id: "550e8400-e29b-41d4-a716-446655440001",
        amount: 42.5,
        type: "expense",
        description: "Weekly groceries",
        date: "2026-03-04",
        source: "web",
        ai_generated: false,
      });
    });
  });

  it("shows success toast on successful submission", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue({
      success: true,
      data: { id: "new-tx-id" },
    });

    render(<TransactionForm categories={sampleCategories} />);

    await fillForm(user, { amount: "25" });
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith("Expense added");
    });
  });

  it("shows error toast on failed submission", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue({
      success: false,
      error: "Category type mismatch",
    });

    render(<TransactionForm categories={sampleCategories} />);

    await fillForm(user, { amount: "25" });
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Category type mismatch");
    });
  });

  it("resets form after successful submission", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockResolvedValue({
      success: true,
      data: { id: "new-tx-id" },
    });

    render(<TransactionForm categories={sampleCategories} />);

    const amountInput = screen.getByLabelText("Amount");
    const descriptionInput = screen.getByLabelText("Description");

    await fillForm(user, { amount: "25", description: "Test" });
    await user.click(screen.getByRole("button", { name: /add expense/i }));

    await waitFor(() => {
      expect(amountInput).toHaveValue(null);
      expect(descriptionInput).toHaveValue("");
    });
  });

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup();
    mockCreateTransaction.mockReturnValue(new Promise(() => {}));

    render(<TransactionForm categories={sampleCategories} />);

    await fillForm(user, { amount: "25.50" });

    const submitButton = screen.getByRole("button", { name: /add expense/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
  });
});
