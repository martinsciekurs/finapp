"use client";

import { startTransition, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrencyCompact, roundAmount } from "@/lib/utils/currency";
import { upsertIncomeTarget } from "@/app/dashboard/budget/actions";
import type { BudgetSummary } from "@/lib/types/budget";
import { Check, Pencil, X } from "lucide-react";

interface BudgetSummaryCardProps {
  summary: BudgetSummary;
  currency: string;
  yearMonth: string;
}

export function BudgetSummaryCard({
  summary,
  currency,
  yearMonth,
}: BudgetSummaryCardProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(
    summary.incomeTarget > 0 ? String(summary.incomeTarget) : ""
  );
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const amount = roundAmount(inputValue);
    if (!amount || amount <= 0) return;
    setSaving(true);
    try {
      await new Promise<void>((resolve) => {
        startTransition(async () => {
          const result = await upsertIncomeTarget({ yearMonth, amount });
          if (!result.success) {
            setInputValue(
              summary.incomeTarget > 0 ? String(summary.incomeTarget) : ""
            );
          }
          resolve();
        });
      });
    } finally {
      setEditing(false);
      setSaving(false);
    }
  }

  function handleCancel() {
    setInputValue(
      summary.incomeTarget > 0 ? String(summary.incomeTarget) : ""
    );
    setEditing(false);
  }

  return (
    <Card>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {/* Expected Income */}
          <div>
            <p className="text-xs text-muted-foreground">Expected Income</p>
            {editing ? (
              <div className="mt-1 flex items-center gap-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="h-7 w-24 text-sm"
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
                  aria-label="Save income target"
                >
                  <Check />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleCancel}
                  disabled={saving}
                  aria-label="Cancel editing"
                >
                  <X />
                </Button>
              </div>
            ) : (
              <button
                className="mt-1 flex items-center gap-1 text-lg font-bold hover:text-primary"
                onClick={() => setEditing(true)}
              >
                {summary.incomeTarget > 0
                  ? formatCurrencyCompact(summary.incomeTarget, currency)
                  : "Set target"}
                <Pencil className="size-3 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Total Budgeted */}
          <div>
            <p className="text-xs text-muted-foreground">Total Budgeted</p>
            <p className="mt-1 text-lg font-bold">
              {formatCurrencyCompact(summary.totalBudgeted, currency)}
            </p>
          </div>

          {/* Left to Assign */}
          <div>
            <p className="text-xs text-muted-foreground">Left to Assign</p>
            <p
              className={`mt-1 text-lg font-bold ${
                summary.leftToAssign >= 0
                  ? "text-primary"
                  : "text-destructive"
              }`}
            >
              {formatCurrencyCompact(summary.leftToAssign, currency)}
            </p>
          </div>

          {/* Total Spent */}
          <div>
            <p className="text-xs text-muted-foreground">Total Spent</p>
            <p className="mt-1 text-lg font-bold">
              {formatCurrencyCompact(summary.totalSpent, currency)}
            </p>
          </div>

          {/* Left to Spend */}
          <div>
            <p className="text-xs text-muted-foreground">Left to Spend</p>
            <p
              className={`mt-1 text-lg font-bold ${
                summary.leftToSpend >= 0
                  ? "text-primary"
                  : "text-destructive"
              }`}
            >
              {formatCurrencyCompact(summary.leftToSpend, currency)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
