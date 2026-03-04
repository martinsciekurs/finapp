import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Budget",
};

export default function BudgetPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Budget</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Category cards with progress bars coming in Phase 2D.
      </p>
    </div>
  );
}
