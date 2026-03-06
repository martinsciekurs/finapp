"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { PieChart } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryIcon } from "@/components/ui/category-icon";
import { SparklineChart } from "@/components/ui/sparkline-chart";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/ui/empty-state";
import type {
  BudgetCategoryData,
  BudgetHistoricalData,
  BudgetOverviewData,
  UnbudgetedCategoryData,
} from "@/lib/types/dashboard";

interface BudgetOverviewProps {
  data: BudgetOverviewData;
  currency: string;
  historicalData?: BudgetHistoricalData;
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

function getPacePercent(): number {
  const now = new Date();
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return (day / daysInMonth) * 100;
}

// ────────────────────────────────────────────
// BudgetProgressRow
// ────────────────────────────────────────────

function BudgetProgressRow({
  category,
  currency,
  index,
  sparklineData,
  pacePercent,
}: {
  category: BudgetCategoryData;
  currency: string;
  index: number;
  sparklineData?: number[];
  pacePercent?: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const percent = getProgressPercent(category.spent, category.budgetLimit);
  const variant = getProgressVariant(percent);
  const isOver = category.spent > category.budgetLimit;

  const hasSparkline = sparklineData && sparklineData.some((v) => v > 0);

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

      <div className="flex items-center gap-2.5">
        {hasSparkline && (
          <SparklineChart
            data={sparklineData}
            width={72}
            height={24}
            color={category.color}
          />
        )}
        <div className="relative flex-1">
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
          {pacePercent != null && (
            <motion.div
              className="absolute top-1/2 h-2.5 w-[2px] rounded-full bg-foreground/30"
              style={{ left: `${pacePercent}%`, transform: "translateX(-50%) translateY(-50%)" }}
              title={`${Math.round(pacePercent)}% through the month`}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { duration: 0.25, delay: 0.2 + index * 0.05 }
              }
            />
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// UnbudgetedRow
// ────────────────────────────────────────────

function UnbudgetedRow({
  category,
  currency,
  index,
}: {
  category: UnbudgetedCategoryData;
  currency: string;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();

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
            className="size-4 shrink-0 text-muted-foreground/60"
            aria-label={category.name}
          />
          <span className="truncate text-muted-foreground">
            {category.name}
          </span>
        </div>
        <span className={cn(
          "shrink-0 text-xs tabular-nums",
          category.spent > 0 ? "text-destructive" : "text-muted-foreground"
        )}>
          {category.spent > 0
            ? formatCurrency(category.spent, currency)
            : "No budget"}
        </span>
      </div>

      {/* Progress bar - always 100% wide and red when spending exists */}
      {category.spent > 0 && (
        <div
          className="h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${category.name}: unbudgeted spending`}
        >
          <motion.div
            className="h-full rounded-full bg-destructive"
            initial={prefersReducedMotion ? { width: "100%" } : { width: "0%" }}
            animate={{ width: "100%" }}
            transition={
              prefersReducedMotion
                ? { duration: 0 }
                : { duration: 0.3, ease: "easeOut", delay: 0.1 + index * 0.05 }
            }
          />
        </div>
      )}
    </motion.div>
  );
}

// ────────────────────────────────────────────
// BudgetOverview (exported)
// ────────────────────────────────────────────

/**
 * Budget overview section for the dashboard.
 *
 * Shows:
 * 1. Compact allocation summary in the card header (income vs budgeted)
 * 2. Per-category progress bars for budgeted expense categories
 * 3. Unbudgeted expense categories listed below a divider
 */
export function BudgetOverview({ data, currency, historicalData }: BudgetOverviewProps) {
  const {
    incomeTarget,
    totalBudgeted,
    budgetedCategories,
    unbudgetedCategories,
  } = data;

  const [pacePercent, setPacePercent] = useState<number | null>(null);
  useEffect(() => {
    setPacePercent(getPacePercent());
  }, []);

  const hasContent =
    budgetedCategories.length > 0 || unbudgetedCategories.length > 0;

  if (!hasContent) {
    return (
      <div data-tour="budget-overview">
        <EmptyState
          icon={PieChart}
          title="No budgets set"
          description="Set budget limits on your expense categories to track your spending here."
        />
      </div>
    );
  }

  const leftToAllocate = incomeTarget - totalBudgeted;
  const isOver = totalBudgeted > incomeTarget;

  return (
    <Card data-tour="budget-overview">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="font-serif text-base font-semibold">
              Budget Overview
            </CardTitle>
            {incomeTarget > 0 && (
              <CardDescription className="text-xs tabular-nums">
                {formatCurrency(totalBudgeted, currency)} of{" "}
                {formatCurrency(incomeTarget, currency)} budgeted
                <span className="mx-1.5 text-border">|</span>
                <span
                  className={cn(
                    "font-medium",
                    isOver ? "text-destructive" : "text-primary"
                  )}
                >
                  {formatCurrency(Math.abs(leftToAllocate), currency)}{" "}
                  {isOver ? "over-allocated" : "left to allocate"}
                </span>
              </CardDescription>
            )}
          </div>

          <Link
            href="/dashboard/budget"
            className="shrink-0 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View budget
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budgeted categories with progress bars */}
        {budgetedCategories.map((category, index) => (
          <BudgetProgressRow
            key={category.id}
            category={category}
            currency={currency}
            index={index}
            sparklineData={historicalData?.spendingByCategory[category.id]}
            pacePercent={pacePercent ?? undefined}
          />
        ))}

        {/* Unbudgeted spending section */}
        {unbudgetedCategories.length > 0 && (
          <>
            {/* Divider with label */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-medium text-muted-foreground/70">
                Not Budgeted
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>

            {/* Unbudgeted category rows */}
            {unbudgetedCategories.map((category, index) => (
              <UnbudgetedRow
                key={category.id}
                category={category}
                currency={currency}
                index={index + budgetedCategories.length}
              />
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
