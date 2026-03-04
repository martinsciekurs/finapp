"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import { formatRelativeTime } from "@/lib/utils/date";
import { EmptyState } from "@/components/ui/empty-state";
import type { RecentTransactionData } from "@/lib/types/dashboard";

export type { RecentTransactionData };

interface RecentTransactionsProps {
  transactions: RecentTransactionData[];
  currency: string;
}

// ────────────────────────────────────────────
// TransactionRow
// ────────────────────────────────────────────

function TransactionRow({
  transaction,
  currency,
  index,
}: {
  transaction: RecentTransactionData;
  currency: string;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const isExpense = transaction.type === "expense";

  return (
    <motion.div
      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, delay: index * 0.04 }
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
          {transaction.description}
        </p>
        <p className="text-xs text-muted-foreground">
          {transaction.categoryName}
        </p>
      </div>

      {/* Amount & date */}
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
        <p className="text-xs text-muted-foreground">
          {formatRelativeTime(transaction.date)}
        </p>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// RecentTransactions (exported)
// ────────────────────────────────────────────

/**
 * Recent transactions section for the dashboard overview.
 * Shows the latest 5 transactions with category, amount, and relative date.
 * Links to the full transactions page.
 */
export function RecentTransactions({
  transactions,
  currency,
}: RecentTransactionsProps) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions yet"
        description="Add your first transaction to start tracking your spending and income."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-base font-semibold">
          Recent Transactions
        </CardTitle>
        <CardAction>
          <Link
            href="/dashboard/transactions"
            className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {transactions.map((tx, index) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            currency={currency}
            index={index}
          />
        ))}
      </CardContent>
    </Card>
  );
}
