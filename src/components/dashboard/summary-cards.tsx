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
import type { SummaryPeriod } from "@/lib/types/dashboard";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export interface SummaryCardsProps {
  income: Record<SummaryPeriod, number>;
  spending: Record<SummaryPeriod, number>;
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
// Period selectors
// ────────────────────────────────────────────

const SUMMARY_PERIOD_OPTIONS: { value: SummaryPeriod; label: string }[] = [
  { value: "month", label: "This month" },
  { value: "7d", label: "Last 7 days" },
];

const REMINDER_PERIOD_OPTIONS: { value: ReminderPeriod; label: string }[] = [
  { value: "7d", label: "Next 7 days" },
  { value: "end_of_month", label: "Until end of month" },
];

function PeriodSelect<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  ariaLabel: string;
}) {
  return (
    <div className="relative inline-flex items-center group">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={ariaLabel}
        className="appearance-none bg-transparent pr-4 cursor-pointer text-xs text-muted-foreground focus:outline-none"
      >
        {options.map((opt) => (
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
  );
}

// ────────────────────────────────────────────
// SummaryCards (exported)
// ────────────────────────────────────────────

export function SummaryCards({
  income,
  spending,
  upcomingReminders,
  currency,
}: SummaryCardsProps) {
  const [incomePeriod, setIncomePeriod] = useState<SummaryPeriod>("month");
  const [spendingPeriod, setSpendingPeriod] = useState<SummaryPeriod>("month");
  const [reminderPeriod, setReminderPeriod] = useState<ReminderPeriod>("7d");

  const currencyFormatter = useCallback(
    (n: number) => formatCurrency(n, currency),
    [currency]
  );
  const countFormatter = useCallback(
    (n: number) => String(Math.round(n)),
    []
  );

  const periodStats = upcomingReminders.byPeriod[reminderPeriod];
  const totalCount = periodStats.count + upcomingReminders.overdueCount;

  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="region"
      aria-label="Financial summary"
    >
      {/* Income card */}
      <SummaryCardItem
        label="Income"
        icon={TrendingUp}
        subtitle={
          <PeriodSelect
            value={incomePeriod}
            onChange={setIncomePeriod}
            options={SUMMARY_PERIOD_OPTIONS}
            ariaLabel="Income period"
          />
        }
        index={0}
      >
        <AnimatedCounter
          value={income[incomePeriod]}
          formatValue={currencyFormatter}
        />
      </SummaryCardItem>

      {/* Spending card */}
      <SummaryCardItem
        label="Spending"
        icon={DollarSign}
        subtitle={
          <PeriodSelect
            value={spendingPeriod}
            onChange={setSpendingPeriod}
            options={SUMMARY_PERIOD_OPTIONS}
            ariaLabel="Spending period"
          />
        }
        index={1}
      >
        <AnimatedCounter
          value={spending[spendingPeriod]}
          formatValue={currencyFormatter}
        />
      </SummaryCardItem>

      {/* Scheduled Payments card */}
      <SummaryCardItem
        label="Scheduled Payments"
        icon={CalendarClock}
        subtitle={
          <PeriodSelect
            value={reminderPeriod}
            onChange={setReminderPeriod}
            options={REMINDER_PERIOD_OPTIONS}
            ariaLabel="Filter period"
          />
        }
        index={2}
      >
        <AnimatedCounter value={totalCount} formatValue={countFormatter} />
      </SummaryCardItem>
    </div>
  );
}
