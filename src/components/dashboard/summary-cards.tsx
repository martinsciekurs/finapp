"use client";

import { useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { AnimatedCounter } from "./animated-counter";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface SummaryCardsProps {
  totalSpent: number;
  totalIncome: number;
  weeklySpending: number;
  upcomingReminders: number;
  currency: string;
}

interface SummaryCardItemProps {
  label: string;
  icon: LucideIcon;
  subtitle?: string;
  index: number;
  children: React.ReactNode;
}

// ────────────────────────────────────────────
// SummaryCardItem
// ────────────────────────────────────────────

function SummaryCardItem({
  label,
  icon: Icon,
  subtitle,
  index,
  children,
}: SummaryCardItemProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={
        prefersReducedMotion
          ? { duration: 0 }
          : { duration: 0.25, ease: "easeOut", delay: index * 0.08 }
      }
    >
      <Card className="gap-0 py-5">
        <CardContent className="space-y-3">
          {/* Icon + label row */}
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon className="size-4" strokeWidth={1.75} />
            <span className="text-sm font-medium">{label}</span>
          </div>

          {/* Big value */}
          <div className="text-2xl font-bold tracking-tight sm:text-3xl">
            {children}
          </div>

          {/* Subtitle */}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// SummaryCards (exported)
// ────────────────────────────────────────────

/**
 * Three summary cards matching the dashboard overview design:
 * - Total Spent This Month (currency)
 * - Weekly Spending (currency, last 7 days)
 * - Upcoming Reminders (count)
 */
export function SummaryCards({
  totalSpent,
  totalIncome,
  weeklySpending,
  upcomingReminders,
  currency,
}: SummaryCardsProps) {
  const currencyFormatter = useCallback(
    (n: number) => formatCurrency(n, currency),
    [currency]
  );
  const countFormatter = useCallback(
    (n: number) => String(Math.round(n)),
    []
  );

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="region"
      aria-label="Financial summary"
    >
      <SummaryCardItem
        label="Total Spent This Month"
        icon={DollarSign}
        subtitle={`Income: ${formatCurrency(totalIncome, currency)}`}
        index={0}
      >
        <AnimatedCounter
          value={totalSpent}
          formatValue={currencyFormatter}
        />
      </SummaryCardItem>

      <SummaryCardItem
        label="Weekly Spending"
        icon={TrendingUp}
        subtitle="Last 7 days"
        index={1}
      >
        <AnimatedCounter
          value={weeklySpending}
          formatValue={currencyFormatter}
        />
      </SummaryCardItem>

      <SummaryCardItem
        label="Upcoming Reminders"
        icon={CalendarClock}
        subtitle="Bills & scheduled payments"
        index={2}
      >
        <AnimatedCounter
          value={upcomingReminders}
          formatValue={countFormatter}
        />
      </SummaryCardItem>
    </div>
  );
}
