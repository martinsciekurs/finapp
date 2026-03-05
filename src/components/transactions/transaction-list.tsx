"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Receipt,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";
import { deleteTransaction } from "@/app/dashboard/transactions/actions";
import { EditTransactionDialog } from "./edit-transaction-dialog";
import type {
  CategoryOption,
  TransactionData,
  TransactionTypeFilter,
} from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface TransactionListProps {
  transactions: TransactionData[];
  categories: CategoryOption[];
  currency: string;
}

// ────────────────────────────────────────────
// Group transactions by date
// ────────────────────────────────────────────

function groupByDate(
  transactions: TransactionData[]
): Map<string, TransactionData[]> {
  const groups = new Map<string, TransactionData[]>();
  for (const tx of transactions) {
    const existing = groups.get(tx.date);
    if (existing) {
      existing.push(tx);
    } else {
      groups.set(tx.date, [tx]);
    }
  }
  return groups;
}

// ────────────────────────────────────────────
// TransactionRow
// ────────────────────────────────────────────

function TransactionRow({
  transaction,
  categories,
  currency,
  index,
}: {
  transaction: TransactionData;
  categories: CategoryOption[];
  currency: string;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isDeleting, setIsDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const isExpense = transaction.type === "expense";

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const result = await deleteTransaction(transaction.id);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete transaction");
      } else {
        toast.success("Transaction deleted");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.div
      className="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, delay: index * 0.03 }
      }
    >
      {/* Category icon */}
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
        <CategoryIcon
          name={transaction.categoryIcon}
          className="size-4 text-muted-foreground"
          aria-label={transaction.categoryName}
        />
      </div>

      {/* Description & category */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {transaction.description || "No description"}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.categoryName}
        </p>
      </div>

      {/* Amount */}
      <div className="shrink-0 text-right">
        <p
          className={cn(
            "flex items-center justify-end gap-1 text-sm font-semibold tabular-nums",
            isExpense ? "text-foreground" : "text-success"
          )}
        >
          {isExpense ? (
            <ArrowDownLeft className="size-3.5 text-muted-foreground" />
          ) : (
            <ArrowUpRight className="size-3.5 text-success" />
          )}
          {isExpense ? "-" : "+"}
          {formatCurrency(transaction.amount, currency)}
        </p>
      </div>

      {/* Edit & Delete buttons */}
      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100">
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setEditOpen(true)}
          aria-label="Edit transaction"
        >
          <Pencil className="size-3.5 text-muted-foreground" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={handleDelete}
          disabled={isDeleting}
          aria-label="Delete transaction"
        >
          <Trash2 className="size-3.5 text-muted-foreground" />
        </Button>
      </div>

      <EditTransactionDialog
        transaction={transaction}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </motion.div>
  );
}

// ────────────────────────────────────────────
// TransactionList (exported)
// ────────────────────────────────────────────

export function TransactionList({
  transactions,
  categories,
  currency,
}: TransactionListProps) {
  const [filter, setFilter] = useState<TransactionTypeFilter>("all");

  const filtered =
    filter === "all"
      ? transactions
      : transactions.filter((tx) => tx.type === filter);

  const grouped = groupByDate(filtered);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="inline-flex rounded-lg border bg-muted p-0.5">
        {(["all", "expense", "income"] as const).map((type) => (
          <button
            key={type}
            type="button"
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-all",
              filter === type
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setFilter(type)}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            filter === "all"
              ? "No transactions yet"
              : `No ${filter} transactions`
          }
          description={
            filter === "all"
              ? "Add your first transaction using the form above."
              : `No ${filter} transactions found. Try changing the filter.`
          }
        />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([date, txs]) => (
            <div key={date}>
              {/* Date header */}
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {formatDate(date)}
              </h3>
              {/* Transaction rows */}
              <div className="rounded-xl border bg-card shadow-sm">
                {txs.map((tx, index) => (
                  <TransactionRow
                    key={tx.id}
                    transaction={tx}
                    categories={categories}
                    currency={currency}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
