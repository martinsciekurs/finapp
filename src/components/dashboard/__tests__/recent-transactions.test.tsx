import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import type { RecentTransactionData } from "../recent-transactions";

// Shared mock
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// Shared mock
vi.mock("@/components/ui/category-icon", async () => import("@/test/mocks/category-icon"));

import { RecentTransactions } from "../recent-transactions";

const sampleTransactions: RecentTransactionData[] = [
  {
    id: "tx-1",
    amount: 42.5,
    type: "expense",
    description: "Grocery shopping",
    date: "2026-03-04",
    categoryName: "Groceries",
    categoryIcon: "shopping-cart",
    categoryColor: "#4CAF50",
  },
  {
    id: "tx-2",
    amount: 3200,
    type: "income",
    description: "Monthly salary",
    date: "2026-03-01",
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
    categoryName: "Entertainment",
    categoryIcon: "film",
    categoryColor: "#FF5722",
  },
];

describe("RecentTransactions", () => {
  it("renders the card heading", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("Recent Transactions")).toBeInTheDocument();
  });

  it("renders all transaction descriptions", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("Grocery shopping")).toBeInTheDocument();
    expect(screen.getByText("Monthly salary")).toBeInTheDocument();
    expect(screen.getByText("Netflix subscription")).toBeInTheDocument();
  });

  it("renders category names", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Entertainment")).toBeInTheDocument();
  });

  it("renders category icons", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    const icons = screen.getAllByTestId("category-icon");
    expect(icons).toHaveLength(3);
    expect(icons[0]).toHaveTextContent("shopping-cart");
    expect(icons[1]).toHaveTextContent("briefcase");
    expect(icons[2]).toHaveTextContent("film");
  });

  it("renders formatted amounts with correct signs", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    // The sign, amount, and icon are in the same <p>, use a function matcher
    expect(
      screen.getByText((_, el) =>
        el?.tagName === "P" && el.textContent?.includes("-$42.50") || false
      )
    ).toBeInTheDocument();

    expect(
      screen.getByText((_, el) =>
        el?.tagName === "P" && el.textContent?.includes("+$3,200.00") || false
      )
    ).toBeInTheDocument();
  });

  it("renders a 'View all' link to the transactions page", () => {
    render(
      <RecentTransactions transactions={sampleTransactions} currency="USD" />
    );

    const link = screen.getByText("View all");
    expect(link).toBeInTheDocument();
    expect(link.closest("a")).toHaveAttribute(
      "href",
      "/dashboard/transactions"
    );
  });

  it("shows empty state when no transactions", () => {
    render(<RecentTransactions transactions={[]} currency="USD" />);

    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Add your first transaction to start tracking your spending and income."
      )
    ).toBeInTheDocument();
  });

  it("does not show card heading when empty", () => {
    render(<RecentTransactions transactions={[]} currency="USD" />);

    expect(screen.queryByText("Recent Transactions")).not.toBeInTheDocument();
    expect(screen.queryByText("View all")).not.toBeInTheDocument();
  });

  it("renders with EUR currency", () => {
    render(
      <RecentTransactions
        transactions={[sampleTransactions[0]]}
        currency="EUR"
      />
    );

    expect(
      screen.getByText((_, el) =>
        el?.tagName === "P" && el.textContent?.includes("€42.50") || false
      )
    ).toBeInTheDocument();
  });
});
