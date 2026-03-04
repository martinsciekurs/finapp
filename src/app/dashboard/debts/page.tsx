import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Debts",
};

export default function DebtsPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Debts</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Debt tracking and payment logging coming in Phase 2F.
      </p>
    </div>
  );
}
