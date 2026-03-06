"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, CopyCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { formatCurrencyCompact, roundAmount } from "@/lib/utils/currency";
import {
  upsertIncomeTarget,
  bulkUpsertCategoryBudgets,
  upsertCategoryBudget,
} from "@/app/dashboard/budget/actions";
import { getCurrentYearMonth } from "@/lib/utils/date";
import type { PlannerData, SpendingSuggestion } from "@/lib/types/budget";

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ────────────────────────────────────────────
// Year selector
// ────────────────────────────────────────────

function YearSelector({ year }: { year: number }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(y: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", "plan");
    if (y === new Date().getFullYear()) {
      params.delete("year");
    } else {
      params.set("year", String(y));
    }
    router.push(`/dashboard/budget?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => navigate(year - 1)}
        aria-label="Previous year"
      >
        <ChevronLeft />
      </Button>
      <span className="min-w-[60px] text-center text-sm font-medium">
        {year}
      </span>
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => navigate(year + 1)}
        aria-label="Next year"
      >
        <ChevronRight />
      </Button>
    </div>
  );
}

// ────────────────────────────────────────────
// Editable cell
// ────────────────────────────────────────────

function EditableCell({
  value,
  spent,
  isPast,
  currency,
  onSave,
  onCopyToFuture,
}: {
  value: number;
  spent: number;
  isPast: boolean;
  currency: string;
  onSave: (amount: number) => void;
  onCopyToFuture?: (amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value > 0 ? String(value) : "");

  function handleSave() {
    const amount = roundAmount(inputValue);
    if (amount >= 0) {
      onSave(amount);
    }
    setEditing(false);
  }

  function handleCopyToFuture(e: React.MouseEvent) {
    e.preventDefault(); // prevent blur from firing first
    const amount = roundAmount(inputValue);
    if (amount > 0 && onCopyToFuture) {
      onSave(amount);
      onCopyToFuture(amount);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="h-7 w-full border-none bg-transparent text-right text-sm shadow-none focus-visible:ring-0"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
          onBlur={handleSave}
          autoFocus
        />
        {onCopyToFuture && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-primary"
                onMouseDown={handleCopyToFuture}
                aria-label="Apply to future months"
              >
                <CopyCheck className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Apply to all future months
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <button
      className="w-full text-right text-xs tabular-nums hover:text-primary"
      onClick={() => {
        setInputValue(value > 0 ? String(value) : "");
        setEditing(true);
      }}
    >
      <div>{value > 0 ? formatCurrencyCompact(value, currency) : "-"}</div>
      {isPast && spent > 0 && (
        <div className="text-muted-foreground">
          {formatCurrencyCompact(spent, currency)}
        </div>
      )}
    </button>
  );
}

// ────────────────────────────────────────────
// Income row
// ────────────────────────────────────────────

function IncomeRow({
  cells,
  currency,
}: {
  cells: { yearMonth: string; amount: number }[];
  currency: string;
}) {
  const currentYM = getCurrentYearMonth();

  return (
    <tr className="border-b bg-muted/30">
      <td className="sticky left-0 bg-muted/30 px-3 py-2 text-xs font-semibold">
        Income Target
      </td>
      {cells.map((cell, cellIndex) => {
        const isPast = cell.yearMonth < currentYM;
        const futureCells = cells.slice(cellIndex + 1);
        return (
          <td key={cell.yearMonth} className={`px-1 py-1.5 ${cellIndex === cells.length - 1 ? "pr-3" : ""}`}>
            <EditableCell
              value={cell.amount}
              spent={0}
              isPast={isPast}
              currency={currency}
              onSave={(amount) => {
                startTransition(async () => {
                  await upsertIncomeTarget({
                    yearMonth: cell.yearMonth,
                    amount,
                  });
                });
              }}
              onCopyToFuture={
                futureCells.length > 0
                  ? (amount) => {
                      const items = futureCells.map((c) => ({
                        yearMonth: c.yearMonth,
                        amount,
                      }));
                      for (const item of items) {
                        startTransition(async () => {
                          await upsertIncomeTarget(item);
                        });
                      }
                    }
                  : undefined
              }
            />
          </td>
        );
      })}
    </tr>
  );
}

// ────────────────────────────────────────────
// Summary rows (Total Budgeted + Left to Allocate)
// ────────────────────────────────────────────

function getAllocationColor(hasData: boolean, leftToAllocate: number): string {
  if (!hasData) return "text-muted-foreground";
  if (leftToAllocate < 0) return "text-destructive";
  if (leftToAllocate > 0) return "text-primary";
  return "text-muted-foreground";
}

function SummaryRows({
  data,
  currency,
}: {
  data: PlannerData;
  currency: string;
}) {
  // Compute per-month totals from category cells and income cells
  const monthlyTotals = data.income.cells.map((incomeCell, i) => {
    const totalBudgeted = data.categories.reduce(
      (sum, cat) => sum + (cat.cells[i]?.budgeted ?? 0),
      0
    );
    return {
      totalBudgeted,
      leftToAllocate: incomeCell.amount - totalBudgeted,
      hasData: incomeCell.amount > 0 || totalBudgeted > 0,
    };
  });

  return (
    <>
      <tr className="border-b bg-muted/30">
        <td className="sticky left-0 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
          Total Budgeted
        </td>
        {monthlyTotals.map((t, i) => (
          <td
            key={i}
            className={cn(
              "px-1 py-1.5 text-right text-xs tabular-nums text-muted-foreground",
              i === 11 && "pr-3"
            )}
          >
            {t.totalBudgeted > 0
              ? formatCurrencyCompact(t.totalBudgeted, currency)
              : "-"}
          </td>
        ))}
      </tr>
      <tr className="border-b bg-muted/30">
        <td className="sticky left-0 bg-muted/30 px-3 py-2 text-xs font-semibold text-muted-foreground">
          Left to Allocate
        </td>
        {monthlyTotals.map((t, i) => (
          <td
            key={i}
            className={cn(
              "px-1 py-1.5 text-right text-xs font-medium tabular-nums",
              i === 11 && "pr-3",
              getAllocationColor(t.hasData, t.leftToAllocate)
            )}
          >
            {t.hasData
              ? formatCurrencyCompact(t.leftToAllocate, currency)
              : "-"}
          </td>
        ))}
      </tr>
    </>
  );
}

// ────────────────────────────────────────────
// Category row
// ────────────────────────────────────────────

function CategoryRow({
  categoryId,
  name,
  icon,
  color,
  cells,
  currency,
}: {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  cells: { yearMonth: string; budgeted: number; spent: number }[];
  currency: string;
}) {
  const currentYM = getCurrentYearMonth();

  return (
    <tr className="border-b last:border-b-0">
      <td className="sticky left-0 bg-card px-3 py-2">
        <div className="flex items-center gap-2">
          <div
            className="flex size-6 shrink-0 items-center justify-center rounded"
            style={{ backgroundColor: color + "20", color }}
          >
            <CategoryIcon name={icon} className="size-3" />
          </div>
          <span className="truncate text-xs font-medium">{name}</span>
        </div>
      </td>
      {cells.map((cell, cellIndex) => {
        const isPast = cell.yearMonth < currentYM;
        const futureCells = cells.slice(cellIndex + 1);
        return (
          <td key={cell.yearMonth} className={`px-1 py-1.5 ${cellIndex === cells.length - 1 ? "pr-3" : ""}`}>
            <EditableCell
              value={cell.budgeted}
              spent={cell.spent}
              isPast={isPast}
              currency={currency}
              onSave={(amount) => {
                startTransition(async () => {
                  await upsertCategoryBudget({
                    categoryId,
                    yearMonth: cell.yearMonth,
                    amount,
                  });
                });
              }}
              onCopyToFuture={
                futureCells.length > 0
                  ? (amount) => {
                      const items = futureCells.map((c) => ({
                        categoryId,
                        yearMonth: c.yearMonth,
                        amount,
                      }));
                      startTransition(async () => {
                        await bulkUpsertCategoryBudgets({ items });
                      });
                    }
                  : undefined
              }
            />
          </td>
        );
      })}
    </tr>
  );
}

// ────────────────────────────────────────────
// Group rows
// ────────────────────────────────────────────

function GroupRows({
  groupName,
  categories,
  currency,
}: {
  groupName: string;
  categories: PlannerData["categories"];
  currency: string;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={13}
          className="bg-muted/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {groupName}
        </td>
      </tr>
      {categories.map((cat) => (
        <CategoryRow
          key={cat.categoryId}
          categoryId={cat.categoryId}
          name={cat.name}
          icon={cat.icon}
          color={cat.color}
          cells={cat.cells}
          currency={currency}
        />
      ))}
    </>
  );
}

// ────────────────────────────────────────────
// Main Plan View client component
// ────────────────────────────────────────────

interface BudgetPlanViewClientProps {
  data: PlannerData;
  suggestions: SpendingSuggestion[];
  currency: string;
}

export function BudgetPlanViewClient({
  data,
  suggestions,
  currency,
}: BudgetPlanViewClientProps) {
  const suggestionsMap = new Map(
    suggestions.map((s) => [s.categoryId, s.suggestedAmount])
  );

  // Group categories by groupName
  const grouped = new Map<string, typeof data.categories>();
  for (const cat of data.categories) {
    const list = grouped.get(cat.groupName) ?? [];
    list.push(cat);
    grouped.set(cat.groupName, list);
  }

  function handleFillAllFromSpending() {
    const items: { categoryId: string; yearMonth: string; amount: number }[] = [];
    for (const cat of data.categories) {
      const suggested = suggestionsMap.get(cat.categoryId);
      if (suggested && suggested > 0) {
        for (const cell of cat.cells) {
          items.push({
            categoryId: cat.categoryId,
            yearMonth: cell.yearMonth,
            amount: suggested,
          });
        }
      }
    }
    if (items.length > 0) {
      startTransition(async () => {
        await bulkUpsertCategoryBudgets({ items });
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <YearSelector year={data.year} />
        <Button
          variant="outline"
          size="sm"
          onClick={handleFillAllFromSpending}
          disabled={suggestions.length === 0}
        >
          <Sparkles className="size-3.5" />
          Fill from spending
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[1140px] table-fixed border-collapse text-sm">
            <colgroup>
              <col className="w-[180px]" />
              {MONTH_LABELS.map((_, i) => (
                <col key={i} className="w-[80px]" />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Category
                </th>
                {MONTH_LABELS.map((label, i) => (
                  <th
                    key={i}
                    className={`px-1 py-2 text-center text-xs font-medium text-muted-foreground ${i === 11 ? "pr-3" : ""}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <IncomeRow cells={data.income.cells} currency={currency} />
              <SummaryRows data={data} currency={currency} />
              {Array.from(grouped.entries()).map(([groupName, cats]) => (
                <GroupRows
                  key={groupName}
                  groupName={groupName}
                  categories={cats}
                  currency={currency}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
