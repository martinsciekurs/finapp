"use client";

import { motion, useReducedMotion } from "framer-motion";
import { PieChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import type { BudgetCategoryData } from "@/lib/types/dashboard";

export type { BudgetCategoryData };

interface BudgetOverviewProps {
  categories: BudgetCategoryData[];
  currency: string;
}

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function getProgressPercent(spent: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min((spent / limit) * 100, 100);
}

function getProgressVariant(percent: number): "normal" | "warning" | "over" {
  if (percent >= 100) return "over";
  if (percent >= 80) return "warning";
  return "normal";
}

const progressColors = {
  normal: "bg-primary",
  warning: "bg-warning",
  over: "bg-destructive",
} as const;

const progressTextColors = {
  normal: "text-muted-foreground",
  warning: "text-warning-foreground",
  over: "text-destructive",
} as const;

// ────────────────────────────────────────────
// BudgetProgressRow
// ────────────────────────────────────────────

function BudgetProgressRow({
  category,
  currency,
  index,
}: {
  category: BudgetCategoryData;
  currency: string;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const percent = getProgressPercent(category.spent, category.budgetLimit);
  const variant = getProgressVariant(percent);
  const isOver = category.spent > category.budgetLimit;

  return (
    <motion.div
      className="space-y-1.5"
      initial={prefersReducedMotion ? false : { opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.2, delay: index * 0.05 }
      }
    >
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <CategoryIcon
            name={category.icon}
            className="size-4 shrink-0 text-muted-foreground"
            aria-label={category.name}
          />
          <span className="truncate font-medium">{category.name}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-xs tabular-nums">
          <span className={cn(isOver && "font-semibold", progressTextColors[variant])}>
            {formatCurrency(category.spent, currency)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">
            {formatCurrency(category.budgetLimit, currency)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(percent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${category.name} budget: ${Math.round(percent)}% used`}
      >
        <motion.div
          className={cn("h-full rounded-full", progressColors[variant])}
          initial={prefersReducedMotion ? { width: `${percent}%` } : { width: "0%" }}
          animate={{ width: `${percent}%` }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { duration: 0.3, ease: "easeOut", delay: 0.1 + index * 0.05 }
          }
        />
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// BudgetOverview (exported)
// ────────────────────────────────────────────

/**
 * Budget overview section for the dashboard.
 * Displays per-category progress bars for expense categories that have budgets set.
 * Shows an empty state when no budgets are configured.
 */
export function BudgetOverview({ categories, currency }: BudgetOverviewProps) {
  if (categories.length === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="No budgets set"
        description="Set budget limits on your expense categories to track your spending here."
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-serif text-base font-semibold">
          Budget Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category, index) => (
          <BudgetProgressRow
            key={category.id}
            category={category}
            currency={currency}
            index={index}
          />
        ))}
      </CardContent>
    </Card>
  );
}
