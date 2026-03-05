/**
 * Shared types for the Reminders system.
 *
 * Kept in `lib/types/` so that both server-only query modules
 * and client components can import without circular deps.
 */

// ────────────────────────────────────────────
// Core enums
// ────────────────────────────────────────────

export type ReminderFrequency = "monthly" | "weekly" | "yearly" | "one_time";

export type OccurrenceStatus = "overdue" | "upcoming" | "paid";

// ────────────────────────────────────────────
// Reminder template (the recurring schedule)
// ────────────────────────────────────────────

export interface ReminderData {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  frequency: ReminderFrequency;
  is_paid: boolean;
  auto_create_transaction: boolean;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
}

// ────────────────────────────────────────────
// Occurrence — a specific period for a reminder
// ────────────────────────────────────────────

/** A single occurrence (period) of a reminder, e.g. "Rent - Apr 2026" */
export interface ReminderOccurrence {
  reminder_id: string;
  title: string;
  amount: number;
  due_date: string;
  frequency: ReminderFrequency;
  auto_create_transaction: boolean;
  category_id: string | null;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  status: OccurrenceStatus;
  /** If paid, the payment record ID */
  payment_id: string | null;
  /** If paid, when it was paid */
  paid_at: string | null;
  /** Days until/since due (negative = overdue) */
  days_diff: number;
}

// ────────────────────────────────────────────
// Grouped occurrences for page display
// ────────────────────────────────────────────

export interface GroupedOccurrences {
  overdue: ReminderOccurrence[];
  upcoming: ReminderOccurrence[];
  paid: ReminderOccurrence[];
}

// ────────────────────────────────────────────
// Dashboard period filter
// ────────────────────────────────────────────

export type ReminderPeriod = "7d" | "30d" | "end_of_month";

// ────────────────────────────────────────────
// Dashboard card data
// ────────────────────────────────────────────

/** Per-period stats for the upcoming reminders card. */
export interface PeriodStats {
  count: number;
  totalAmount: number;
}

/** Full data for the dashboard reminders card. */
export interface UpcomingRemindersData {
  /** Upcoming stats per period (all 3 precomputed). */
  byPeriod: Record<ReminderPeriod, PeriodStats>;
  /** Number of overdue (unpaid, past due) occurrences. */
  overdueCount: number;
  /** Days until the nearest upcoming due date (null if none). */
  nextDueDays: number | null;
}

