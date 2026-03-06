import type { Metadata } from "next";
import {
  fetchTransactions,
  fetchUserCategories,
  fetchUserTags,
} from "@/lib/queries/transactions";
import { fetchUserCurrency } from "@/lib/queries/dashboard";
import { TransactionForm } from "@/components/transactions/transaction-form";
import { TransactionList } from "@/components/transactions/transaction-list";

export const metadata: Metadata = {
  title: "Transactions",
};

export default async function TransactionsPage() {
  const [transactions, categories, currency, userTags] = await Promise.all([
    fetchTransactions(),
    fetchUserCategories(),
    fetchUserCurrency(),
    fetchUserTags(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">
          Transactions
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your expenses and income.
        </p>
      </div>

      <TransactionForm categories={categories} userTags={userTags} />
      <TransactionList transactions={transactions} categories={categories} currency={currency} userTags={userTags} />
    </div>
  );
}
