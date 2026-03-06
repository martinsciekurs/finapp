import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import type { DebtsPageData } from "@/lib/types/debt";
import type { CategoryOption } from "@/lib/types/transactions";

vi.mock("@/app/dashboard/debts/actions", () => ({
  createDebt: vi.fn().mockResolvedValue({ success: true }),
  updateDebt: vi.fn().mockResolvedValue({ success: true }),
  recordDebtPayment: vi.fn().mockResolvedValue({ success: true }),
  updateDebtPayment: vi.fn().mockResolvedValue({ success: true }),
  deleteDebtPayment: vi.fn().mockResolvedValue({ success: true }),
  deleteDebt: vi.fn().mockResolvedValue({ success: true }),
}));

import { DebtsView } from "../debts-view";

const emptyData: DebtsPageData = {
  summary: { totalOwed: 0, totalLent: 0, net: 0 },
  iOweActive: [],
  theyOweActive: [],
  settled: [],
};

const sampleData: DebtsPageData = {
  summary: {
    totalOwed: 60,
    totalLent: 120,
    net: 60,
  },
  iOweActive: [
    {
      id: "d1",
      counterparty: "John",
      type: "i_owe",
      categoryId: "cat-1",
      categoryName: "Debt",
      categoryIcon: "badge-dollar-sign",
      categoryColor: "#a1a1a1",
      originalAmount: 100,
      remainingAmount: 60,
      description: "Dinner split",
      debtDate: "2026-03-01",
      createdAt: "2026-03-01",
      payments: [
        {
          id: "p1",
          debtId: "d1",
          amount: 40,
          note: null,
          transactionId: "t1",
          createdAt: "2026-03-02",
        },
      ],
    },
  ],
  theyOweActive: [
    {
      id: "d2",
      counterparty: "Alex",
      type: "they_owe",
      categoryId: "cat-2",
      categoryName: "Salary",
      categoryIcon: "wallet",
      categoryColor: "#22c55e",
      originalAmount: 200,
      remainingAmount: 120,
      description: null,
      debtDate: "2026-02-15",
      createdAt: "2026-02-15",
      payments: [],
    },
  ],
  settled: [
    {
      id: "d3",
      counterparty: "Sam",
      type: "i_owe",
      categoryId: "cat-1",
      categoryName: "Debt",
      categoryIcon: "badge-dollar-sign",
      categoryColor: "#a1a1a1",
      originalAmount: 50,
      remainingAmount: 0,
      description: null,
      debtDate: "2026-01-20",
      createdAt: "2026-01-20",
      payments: [
        {
          id: "p2",
          debtId: "d3",
          amount: 50,
          note: "Settled",
          transactionId: "t2",
          createdAt: "2026-01-25",
        },
      ],
    },
  ],
};

const categories: CategoryOption[] = [
  {
    id: "cat-1",
    name: "Debt",
    icon: "badge-dollar-sign",
    color: "#a1a1a1",
    type: "expense",
    group_id: null,
    group_name: null,
  },
  {
    id: "cat-2",
    name: "Salary",
    icon: "wallet",
    color: "#22c55e",
    type: "income",
    group_id: null,
    group_name: null,
  },
];

describe("DebtsView", () => {
  it("shows empty state when there are no debts", () => {
    render(<DebtsView data={emptyData} categories={categories} currency="USD" />);

    expect(screen.getByText("No debts yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Debt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add your first debt" })).toBeInTheDocument();
  });

  it("renders summary cards when debts exist", () => {
    render(<DebtsView data={sampleData} categories={categories} currency="USD" />);

    expect(screen.getByText("You owe")).toBeInTheDocument();
    expect(screen.getByText("You're owed")).toBeInTheDocument();
    expect(screen.getByText("Net")).toBeInTheDocument();
  });

  it("renders active debt sections and debt cards", () => {
    render(<DebtsView data={sampleData} categories={categories} currency="USD" />);

    expect(screen.getByText("I owe")).toBeInTheDocument();
    expect(screen.getByText("They owe me")).toBeInTheDocument();
    expect(screen.getByText("John")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
  });

  it("renders settled section with count", () => {
    render(<DebtsView data={sampleData} categories={categories} currency="USD" />);

    expect(screen.getByText("Settled (1)")).toBeInTheDocument();
  });

  it("shows log payment button only for active debts", () => {
    render(<DebtsView data={sampleData} categories={categories} currency="USD" />);

    expect(screen.getAllByRole("button", { name: "Log payment" })).toHaveLength(2);
  });
});
