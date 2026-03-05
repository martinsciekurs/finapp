"use client";

import { cn } from "@/lib/utils";

interface TransactionTypeToggleProps {
  currentType: "expense" | "income";
  onChange: (type: "expense" | "income") => void;
}

/**
 * Expense / Income radio toggle used by both the create and edit
 * transaction forms.
 */
export function TransactionTypeToggle({
  currentType,
  onChange,
}: TransactionTypeToggleProps) {
  return (
    <div
      className="inline-flex rounded-lg border bg-muted p-0.5"
      role="radiogroup"
      aria-label="Transaction type"
    >
      <button
        type="button"
        role="radio"
        aria-checked={currentType === "expense"}
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
          currentType === "expense"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("expense")}
      >
        Expense
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={currentType === "income"}
        className={cn(
          "rounded-md px-4 py-1.5 text-sm font-medium transition-all",
          currentType === "income"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => onChange("income")}
      >
        Income
      </button>
    </div>
  );
}
