"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Pencil,
  Receipt,
  Trash2,
  X,
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
import { Attachments } from "@/components/attachments/attachments";
import { TransactionSearchBar, filterTransactions } from "./transaction-search-bar";
import { TransactionDateFilter, type DateRange, filterByDateRange } from "./transaction-date-filter";
import { TransactionCategoryFilter, filterByCategory } from "./transaction-category-filter";
import { TagPill } from "./tag-pill";
import type {
  CategoryOption,
  TransactionData,
  TransactionTypeFilter,
} from "@/lib/types/transactions";
import type { TagData } from "@/lib/types/tags";

// ────────────────────────────────────────────
// Props
// ────────────────────────────────────────────

interface TransactionListProps {
  transactions: TransactionData[];
  categories: CategoryOption[];
  currency: string;
  userTags: TagData[];
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
  currency,
  index,
  onEditClick,
}: {
  transaction: TransactionData;
  currency: string;
  index: number;
  onEditClick: (transaction: TransactionData) => void;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isDeleting, setIsDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const isExpense = transaction.type === "expense";
  const attachmentCount = transaction.attachments.length;

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
      className="group rounded-lg px-2 py-3 transition-colors hover:bg-muted/50"
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, delay: index * 0.03 }
      }
    >
      <div
        className="flex cursor-pointer items-center gap-3"
        onClick={() => setExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((prev) => !prev);
          }
        }}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <CategoryIcon
            name={transaction.categoryIcon}
            className="size-4 text-muted-foreground"
            aria-label={transaction.categoryName}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {transaction.description || "No description"}
          </p>
          <p className="text-xs text-muted-foreground">
            {transaction.categoryName}
          </p>
          {transaction.tags.length > 0 && (
            <div className="mt-0.5 flex flex-wrap gap-1">
              {transaction.tags.slice(0, 3).map((tag) => (
                <TagPill key={tag.id} tag={tag} />
              ))}
              {transaction.tags.length > 3 && (
                <span className="text-[11px] text-muted-foreground">
                  +{transaction.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

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

        {attachmentCount > 0 ? (
          <div className="flex shrink-0 items-center gap-0.5 text-muted-foreground">
            <Paperclip className="size-3" />
            <span className="text-[11px] tabular-nums">{attachmentCount}</span>
          </div>
        ) : null}

        <div
          className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 [@media(pointer:coarse)]:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onEditClick(transaction)}
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

        {expanded ? (
          <ChevronUp className="size-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            className="ml-12 mt-2 overflow-hidden"
            initial={prefersReducedMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
          >
            <Attachments
              recordType="transaction"
              recordId={transaction.id}
              initialAttachments={transaction.attachments}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
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
  userTags,
}: TransactionListProps) {
  const [filter, setFilter] = useState<TransactionTypeFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: null, to: null });
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleEditClick(transaction: TransactionData) {
    setSelectedTransaction(transaction);
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setSelectedTransaction(null);
    }
  }

  function clearAllFilters() {
    setSearchQuery("");
    setDateRange({ from: null, to: null });
    setSelectedCategoryId(null);
    setFilter("all");
  }

  let result = transactions;
  result = filter === "all" ? result : result.filter((tx) => tx.type === filter);
  result = filterTransactions(result, searchQuery, currency);
  result = filterByDateRange(result, dateRange);
  result = filterByCategory(result, selectedCategoryId);
  const filtered = result;

  const isFiltersActive =
    searchQuery !== "" ||
    dateRange.from !== null ||
    dateRange.to !== null ||
    selectedCategoryId !== null ||
    filter !== "all";

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

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-0 basis-full sm:basis-auto sm:flex-1">
          <TransactionSearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <TransactionCategoryFilter
          categories={categories}
          value={selectedCategoryId}
          onChange={setSelectedCategoryId}
        />
        <TransactionDateFilter value={dateRange} onChange={setDateRange} />
        {isFiltersActive && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-1">
            <X className="size-3.5" />
            Clear all
          </Button>
        )}
      </div>

      {isFiltersActive && (
        <p className="text-sm text-muted-foreground">
          {filtered.length} of {transactions.length} transactions
        </p>
      )}

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={
            isFiltersActive
              ? "No matching transactions"
              : filter === "all"
              ? "No transactions yet"
              : `No ${filter} transactions`
          }
          description={
            isFiltersActive
              ? "Try adjusting your search or filters."
              : filter === "all"
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
                    currency={currency}
                    index={index}
                    onEditClick={handleEditClick}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTransaction ? (
        <EditTransactionDialog
          transaction={selectedTransaction}
          categories={categories}
          userTags={userTags}
          open={dialogOpen}
          onOpenChange={handleDialogOpenChange}
        />
      ) : null}
    </div>
  );
}
