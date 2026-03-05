"use client";

import { startTransition, useState } from "react";
import { CategoryIcon } from "@/components/ui/category-icon";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact } from "@/lib/utils/currency";
import { upsertCategoryBudget } from "@/app/dashboard/budget/actions";
import type { BudgetCategoryItem, UnbudgetedCategoryItem } from "@/lib/types/budget";
import { Check, X } from "lucide-react";

/** Round to 2 decimal places to match DB numeric(12,2). */
function roundAmount(value: string): number {
  return Math.round(parseFloat(value) * 100) / 100;
}

// ────────────────────────────────────────────
// Budgeted category row (with progress bar)
// ────────────────────────────────────────────

interface BudgetedRowProps {
  item: BudgetCategoryItem;
  currency: string;
  yearMonth: string;
}

export function BudgetedCategoryRow({
  item,
  currency,
  yearMonth,
}: BudgetedRowProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(item.budgeted));
  const [saving, setSaving] = useState(false);

  const pct = item.budgeted > 0 ? (item.spent / item.budgeted) * 100 : 0;
  const clampedPct = Math.min(pct, 100);

  // 3-tier color coding
  let barColor = "bg-primary"; // green: <80%
  if (pct >= 100) {
    barColor = "bg-destructive"; // red: >=100%
  } else if (pct >= 80) {
    barColor = "bg-warning"; // amber: 80-99%
  }

  async function handleSave() {
    const amount = roundAmount(inputValue);
    if (!amount || amount <= 0) {
      setInputValue(String(item.budgeted));
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await new Promise<void>((resolve) => {
        startTransition(async () => {
          await upsertCategoryBudget({
            categoryId: item.categoryId,
            yearMonth,
            amount,
          });
          resolve();
        });
      });
    } finally {
      setEditing(false);
      setSaving(false);
    }
  }

  function handleCancel() {
    setInputValue(String(item.budgeted));
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      {/* Icon */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: item.color + "20", color: item.color }}
      >
        <CategoryIcon
          name={item.icon}
          className="size-4"
          aria-label={`${item.name} icon`}
        />
      </div>

      {/* Name + progress */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{item.name}</span>
          <div className="flex items-center gap-1 text-sm tabular-nums">
            <span className="text-muted-foreground">
              {formatCurrencyCompact(item.spent, currency)}
            </span>
            <span className="text-muted-foreground">/</span>
            {editing ? (
              <div className="flex items-center gap-0.5">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-6 w-20 text-right text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  autoFocus
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleSave}
                  disabled={saving}
                  aria-label="Save budget"
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancel}
                  disabled={saving}
                  aria-label="Cancel"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                className="font-medium hover:text-primary"
                onClick={() => setEditing(true)}
              >
                {formatCurrencyCompact(item.budgeted, currency)}
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(clampedPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${item.name} budget: ${Math.round(pct)}% used`}
        >
          <div
            className={`h-full rounded-full transition-all duration-200 ${barColor}`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// Unbudgeted category row (dashed border, "Set budget")
// ────────────────────────────────────────────

interface UnbudgetedRowProps {
  item: UnbudgetedCategoryItem;
  currency: string;
  yearMonth: string;
}

export function UnbudgetedCategoryRow({
  item,
  currency,
  yearMonth,
}: UnbudgetedRowProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = roundAmount(inputValue);
    if (!amount || amount <= 0) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await new Promise<void>((resolve) => {
        startTransition(async () => {
          await upsertCategoryBudget({
            categoryId: item.categoryId,
            yearMonth,
            amount,
          });
          resolve();
        });
      });
    } finally {
      setEditing(false);
      setSaving(false);
    }
  }

  function handleCancel() {
    setInputValue("");
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-dashed px-3 py-2.5">
      {/* Icon */}
      <div
        className="flex size-8 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: item.color + "20", color: item.color }}
      >
        <CategoryIcon
          name={item.icon}
          className="size-4"
          aria-label={`${item.name} icon`}
        />
      </div>

      {/* Name + spent */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm font-medium">{item.name}</span>
          <div className="flex items-center gap-2 text-sm">
            <span className="tabular-nums text-muted-foreground">
              {formatCurrencyCompact(item.spent, currency)} spent
            </span>
            {editing ? (
              <div className="flex items-center gap-0.5">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-6 w-20 text-right text-sm"
                  placeholder="Budget"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSave();
                    if (e.key === "Escape") handleCancel();
                  }}
                  autoFocus
                  disabled={saving}
                />
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleSave}
                  disabled={saving}
                  aria-label="Save budget"
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancel}
                  disabled={saving}
                  aria-label="Cancel"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="xs"
                onClick={() => setEditing(true)}
              >
                Set budget
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
