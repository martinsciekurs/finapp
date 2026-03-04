import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transactions",
};

export default function TransactionsPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Transactions</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Track your expenses and income. Inline add form and transaction list coming in Phase 2C.
      </p>
    </div>
  );
}
