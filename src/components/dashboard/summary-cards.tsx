"use client";

import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  CalendarClock,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/currency";
import { AnimatedCounter } from "./animated-counter";
import type { UpcomingRemindersData, ReminderPeriod } from "@/lib/types/reminder";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface SummaryCardsProps {
  totalSpent: number;
  totalIncome: number;
  weeklySpending: number;
  upcomingReminders: UpcomingRemindersData;
  currency: string;
}

interface SummaryCardItemProps {
  label: string;
  icon: LucideIcon;
  subtitle?: React.ReactNode;
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
            <div className="text-xs text-muted-foreground">{subtitle}</div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ────────────────────────────────────────────
// Period filter
// ────────────────────────────────────────────

const PERIOD_OPTIONS: { value: ReminderPeriod; label: string }[] = [
  { value: "7d", label: "Next 7 days" },
  { value: "end_of_month", label: "Until end of month" },
];

// ────────────────────────────────────────────
// SummaryCards (exported)
// ────────────────────────────────────────────

export function SummaryCards({
  totalSpent,
  totalIncome,
  weeklySpending,
  upcomingReminders,
  currency,
}: SummaryCardsProps) {
  const [period, setPeriod] = useState<ReminderPeriod>("7d");

  const currencyFormatter = useCallback(
    (n: number) => formatCurrency(n, currency),
    [currency]
  );
  const countFormatter = useCallback(
    (n: number) => String(Math.round(n)),
    []
  );

  const periodStats = upcomingReminders.byPeriod[period];
  const totalCount = periodStats.count + upcomingReminders.overdueCount;

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

      {/* Scheduled Payments card */}
      <SummaryCardItem
          label="Scheduled Payments"
          icon={CalendarClock}
          subtitle={
            <div className="relative inline-flex items-center group">
              <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as ReminderPeriod)}
                  aria-label="Filter period"
                  className="appearance-none bg-transparent pr-4 cursor-pointer text-xs  text-muted-foreground focus:outline-none"
              >
                {PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                ))}
              </select>
              <ChevronDown
                  className="pointer-events-none absolute right-0 size-3 opacity-70 group-hover:opacity-100 transition-opacity"
                  strokeWidth={2.5}
              />
            </div>
          }
          index={2}
      >
        <AnimatedCounter value={totalCount} formatValue={countFormatter} />
      </SummaryCardItem>
    </div>
  );
}
