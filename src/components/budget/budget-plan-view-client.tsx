"use client";

import { startTransition, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Sparkles, Copy, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { formatCurrencyCompact } from "@/lib/utils/currency";
import {
  upsertIncomeTarget,
  bulkUpsertCategoryBudgets,
  upsertCategoryBudget,
} from "@/app/dashboard/budget/actions";
import { getCurrentYearMonth } from "@/lib/utils/date";
import type { PlannerData, SpendingSuggestion } from "@/lib/types/budget";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/** Round to 2 decimal places to match DB numeric(12,2). */
function roundAmount(value: string): number {
  return Math.round(parseFloat(value) * 100) / 100;
}

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
}: {
  value: number;
  spent: number;
  isPast: boolean;
  currency: string;
  onSave: (amount: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value > 0 ? String(value) : "");

  function handleSave() {
    const amount = roundAmount(inputValue);
    if (amount > 0) {
      onSave(amount);
    }
    setEditing(false);
  }

  if (editing) {
    return (
      <Input
        type="number"
        step="0.01"
        min="0"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className="h-6 w-full min-w-[60px] text-right text-xs"
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSave();
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={handleSave}
        autoFocus
      />
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
      {cells.map((cell) => {
        const isPast = cell.yearMonth < currentYM;
        return (
          <td key={cell.yearMonth} className="px-1 py-1.5">
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
            />
          </td>
        );
      })}
      <td className="px-2 py-1.5" />
    </tr>
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
  suggestions,
}: {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  cells: { yearMonth: string; budgeted: number; spent: number }[];
  currency: string;
  suggestions: Map<string, number>;
}) {
  const currentYM = getCurrentYearMonth();

  function handleFillFromSpending() {
    const suggested = suggestions.get(categoryId);
    if (suggested && suggested > 0) {
      const items = cells.map((c) => ({
        categoryId,
        yearMonth: c.yearMonth,
        amount: suggested,
      }));
      startTransition(async () => {
        await bulkUpsertCategoryBudgets({ items });
      });
    }
  }

  function handleApplyToRemaining() {
    const currentCell = cells.find((c) => c.yearMonth === currentYM);
    const amount = currentCell?.budgeted;
    if (!amount || amount <= 0) return;
    const futureItems = cells
      .filter((c) => c.yearMonth > currentYM)
      .map((c) => ({ categoryId, yearMonth: c.yearMonth, amount }));
    if (futureItems.length > 0) {
      startTransition(async () => {
        await bulkUpsertCategoryBudgets({ items: futureItems });
      });
    }
  }

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
      {cells.map((cell) => {
        const isPast = cell.yearMonth < currentYM;
        return (
          <td key={cell.yearMonth} className="px-1 py-1.5">
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
            />
          </td>
        );
      })}
      <td className="px-2 py-1.5">
        <div className="flex gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            title="Fill from 3-month average"
            onClick={handleFillFromSpending}
            disabled={!suggestions.has(categoryId)}
          >
            <Sparkles className="size-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            title="Apply current month to future"
            onClick={handleApplyToRemaining}
          >
            <Copy className="size-3" />
          </Button>
        </div>
      </td>
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
  suggestionsMap,
}: {
  groupName: string;
  categories: PlannerData["categories"];
  currency: string;
  suggestionsMap: Map<string, number>;
}) {
  return (
    <>
      <tr>
        <td
          colSpan={14}
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
          suggestions={suggestionsMap}
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
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b">
                <th className="sticky left-0 bg-card px-3 py-2 text-left text-xs font-medium text-muted-foreground">
                  Category
                </th>
                {MONTH_LABELS.map((label, i) => (
                  <th
                    key={i}
                    className="px-1 py-2 text-center text-xs font-medium text-muted-foreground"
                  >
                    {label}
                  </th>
                ))}
                <th className="px-2 py-2 text-xs font-medium text-muted-foreground">
                  <CalendarRange className="mx-auto size-3.5" />
                </th>
              </tr>
            </thead>
            <tbody>
              <IncomeRow cells={data.income.cells} currency={currency} />
              {Array.from(grouped.entries()).map(([groupName, cats]) => (
                <GroupRows
                  key={groupName}
                  groupName={groupName}
                  categories={cats}
                  currency={currency}
                  suggestionsMap={suggestionsMap}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
