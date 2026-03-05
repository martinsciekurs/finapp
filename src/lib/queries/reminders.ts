import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatDateForInput } from "@/lib/utils/date";
import { clampDayToMonth } from "@/lib/utils/recurrence";
import { DEFAULT_CATEGORY_COLOR } from "@/lib/config/categories";
import type {
  ReminderData,
  ReminderFrequency,
  ReminderOccurrence,
  OccurrenceStatus,
  GroupedOccurrences,
  ReminderPeriod,
  PeriodStats,
  UpcomingRemindersData,
} from "@/lib/types/reminder";
import type { CategoryOption } from "@/lib/types/transactions";
import { parseCategoryJoin, parseGroupJoin } from "@/lib/types/dashboard";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

/** Calculate days between two YYYY-MM-DD strings (positive = future). */
function daysDiff(dateStr: string, today: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const t = new Date(today + "T00:00:00");
  return Math.round((d.getTime() - t.getTime()) / (1000 * 60 * 60 * 24));
}

/** Get the end date for a period filter relative to today. */
function getPeriodEnd(period: ReminderPeriod): string {
  const now = new Date();
  if (period === "7d") {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    return formatDateForInput(d);
  }
  // end_of_month
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return formatDateForInput(d);
}

/**
 * Advance a date by N months, clamping the day to the last day of the
 * target month to prevent end-of-month drift (e.g., Jan 31 + 1 month = Feb 28).
 */
function advanceMonths(year: number, month: number, originalDay: number, addMonths: number): Date {
  const targetMonth = month + addMonths;
  const targetYear = year + Math.floor(targetMonth / 12);
  const targetMon = ((targetMonth % 12) + 12) % 12; // handle negatives
  return new Date(targetYear, targetMon, clampDayToMonth(targetYear, targetMon + 1, originalDay));
}

/**
 * Generate occurrence dates for a reminder within a date range.
 * Returns an array of YYYY-MM-DD strings.
 */
function generateOccurrences(
  startDate: string,
  frequency: ReminderFrequency,
  rangeStart: string,
  rangeEnd: string
): string[] {
  const dates: string[] = [];

  if (frequency === "one_time") {
    if (startDate >= rangeStart && startDate <= rangeEnd) {
      dates.push(startDate);
    }
    return dates;
  }

  // Parse starting date — remember the original day for clamping
  const [startY, startM, startD] = startDate.split("-").map(Number);
  const originalDay = startD;
  const end = new Date(rangeEnd + "T23:59:59");

  // The effective start of the range is the later of rangeStart and
  // the reminder's own startDate — we never generate occurrences
  // before the reminder existed.
  const effectiveStart = startDate > rangeStart ? startDate : rangeStart;
  const effectiveStartDate = new Date(effectiveStart + "T00:00:00");

  // Jump forward deterministically to the first occurrence >= effectiveStart
  let current: Date;
  if (frequency === "weekly") {
    // Compute the first occurrence on or after effectiveStart
    const base = new Date(startY, startM - 1, startD);
    const diffMs = effectiveStartDate.getTime() - base.getTime();
    if (diffMs <= 0) {
      current = base;
    } else {
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weeksAhead = Math.floor(diffDays / 7);
      current = new Date(base.getTime() + weeksAhead * 7 * 24 * 60 * 60 * 1000);
      // If we landed before effectiveStart, still in range — the generate
      // loop below will filter by effectiveStart string comparison
    }
  } else if (frequency === "monthly") {
    const baseMonth = (startY - 1) * 12 + (startM - 1);
    const effY = effectiveStartDate.getFullYear();
    const effM = effectiveStartDate.getMonth();
    const targetMonth = (effY - 1) * 12 + effM;
    let monthsAhead = targetMonth - baseMonth;
    if (monthsAhead < 0) monthsAhead = 0;
    current = advanceMonths(startY, startM - 1, originalDay, monthsAhead);
    // Step back one if we overshot, so the loop catches the boundary
    if (current > effectiveStartDate) {
      current = advanceMonths(startY, startM - 1, originalDay, monthsAhead - 1);
    }
  } else {
    // yearly
    let yearsAhead = effectiveStartDate.getFullYear() - startY;
    if (yearsAhead < 0) yearsAhead = 0;
    current = advanceMonths(startY, startM - 1, originalDay, yearsAhead * 12);
    if (current > effectiveStartDate) {
      current = advanceMonths(startY, startM - 1, originalDay, (yearsAhead - 1) * 12);
    }
  }

  // Track total months offset from start for monthly/yearly clamped advance
  let monthOffset = frequency === "weekly"
    ? 0
    : (current.getFullYear() - startY) * 12 + (current.getMonth() - (startM - 1));

  // Generate forward from current
  const maxIterations = 500; // safety limit
  let iterations = 0;
  while (current <= end && iterations < maxIterations) {
    const dateStr = formatDateForInput(current);
    if (dateStr >= effectiveStart && dateStr <= rangeEnd) {
      dates.push(dateStr);
    }
    if (frequency === "weekly") {
      current = new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (frequency === "monthly") {
      monthOffset++;
      current = advanceMonths(startY, startM - 1, originalDay, monthOffset);
    } else {
      monthOffset += 12;
      current = advanceMonths(startY, startM - 1, originalDay, monthOffset);
    }
    iterations++;
  }

  return dates;
}

// ────────────────────────────────────────────
// Fetch all reminders with occurrences
// ────────────────────────────────────────────

/**
 * Fetch all user reminders, generate occurrences for a window
 * (3 months back, 3 months forward), and join with payment records.
 * Groups into overdue/upcoming/paid.
 */
export async function fetchReminders(): Promise<GroupedOccurrences> {
  const supabase = await createClient();
  const today = formatDateForInput(new Date());

  // Occurrence window: 3 months back, 3 months forward
  const now = new Date();
  const rangeStartDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const rangeEndDate = new Date(now.getFullYear(), now.getMonth() + 4, 0);
  const rangeStart = formatDateForInput(rangeStartDate);
  const rangeEnd = formatDateForInput(rangeEndDate);

  // Parallel fetches: reminders + payment records
  const [remindersResult, paymentsResult] = await Promise.all([
    supabase
      .from("reminders")
      .select(
        "id, title, amount, due_date, frequency, auto_create_transaction, category_id, categories(name, icon, color)"
      )
      .order("due_date", { ascending: true }),
    supabase
      .from("reminder_payments")
      .select("id, reminder_id, due_date, paid_at")
      .gte("due_date", rangeStart)
      .lte("due_date", rangeEnd),
  ]);

  if (remindersResult.error) {
    throw new Error(`Failed to fetch reminders: ${remindersResult.error.message}`);
  }
  if (paymentsResult.error) {
    throw new Error(`Failed to fetch payments: ${paymentsResult.error.message}`);
  }

  // Build payment lookup: "reminder_id:due_date" -> payment record
  const paymentMap = new Map<string, { id: string; paid_at: string }>();
  for (const p of paymentsResult.data ?? []) {
    paymentMap.set(`${p.reminder_id}:${p.due_date}`, {
      id: p.id,
      paid_at: p.paid_at,
    });
  }

  const grouped: GroupedOccurrences = {
    overdue: [],
    upcoming: [],
    paid: [],
  };

  for (const row of remindersResult.data ?? []) {
    const cat = parseCategoryJoin(row.categories);

    // Generate occurrences for this reminder within the window
    const occurrenceDates = generateOccurrences(
      row.due_date,
      row.frequency,
      rangeStart,
      rangeEnd
    );

    // Track whether we've already found the next upcoming for this reminder.
    // We only show ONE upcoming occurrence per reminder (the nearest).
    let foundNextUpcoming = false;

    for (const dueDate of occurrenceDates) {
      const key = `${row.id}:${dueDate}`;
      const payment = paymentMap.get(key);
      const diff = daysDiff(dueDate, today);

      let status: OccurrenceStatus;
      if (payment) {
        status = "paid";
      } else if (dueDate < today) {
        status = "overdue";
      } else {
        status = "upcoming";
      }

      // For upcoming: only keep the first (nearest) unpaid future occurrence
      if (status === "upcoming") {
        if (foundNextUpcoming) continue;
        foundNextUpcoming = true;
      }

      const occurrence: ReminderOccurrence = {
        reminder_id: row.id,
        title: row.title,
        amount: row.amount,
        due_date: dueDate,
        frequency: row.frequency,
        auto_create_transaction: row.auto_create_transaction,
        category_id: row.category_id,
        category_name: cat?.name ?? "Uncategorized",
        category_icon: cat?.icon ?? "circle",
        category_color: cat?.color ?? DEFAULT_CATEGORY_COLOR,
        status,
        payment_id: payment?.id ?? null,
        paid_at: payment?.paid_at ?? null,
        days_diff: diff,
      };

      grouped[status].push(occurrence);
    }
  }

  // Sort: overdue ascending (most overdue first), upcoming ascending, paid descending
  grouped.overdue.sort((a, b) => a.due_date.localeCompare(b.due_date));
  grouped.upcoming.sort((a, b) => a.due_date.localeCompare(b.due_date));
  grouped.paid.sort((a, b) => b.due_date.localeCompare(a.due_date));

  return grouped;
}

// ────────────────────────────────────────────
// Fetch reminder templates (for edit/delete)
// ────────────────────────────────────────────

export async function fetchReminderTemplates(): Promise<ReminderData[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reminders")
    .select(
      "id, title, amount, due_date, frequency, auto_create_transaction, category_id, categories(name, icon, color)"
    )
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch reminders: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const cat = parseCategoryJoin(row.categories);

    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      due_date: row.due_date,
      frequency: row.frequency,
      auto_create_transaction: row.auto_create_transaction,
      category_id: row.category_id,
      category_name: cat?.name ?? "Uncategorized",
      category_icon: cat?.icon ?? "circle",
      category_color: cat?.color ?? DEFAULT_CATEGORY_COLOR,
    };
  });
}

// ────────────────────────────────────────────
// Fetch upcoming reminders for dashboard card
// ────────────────────────────────────────────

/**
 * Fetch upcoming reminders data for the dashboard card.
 * Precomputes stats for all 3 period options so the client can
 * switch instantly, and includes overdue count.
 */
export async function fetchUpcomingRemindersData(): Promise<UpcomingRemindersData> {
  const supabase = await createClient();
  const today = formatDateForInput(new Date());

  // Compute all period ends
  const periodEnds: Record<ReminderPeriod, string> = {
    "7d": getPeriodEnd("7d"),
    end_of_month: getPeriodEnd("end_of_month"),
  };

  // The widest window covers all periods + overdue lookback (3 months)
  const now = new Date();
  const overdueStart = formatDateForInput(
    new Date(now.getFullYear(), now.getMonth() - 3, 1)
  );
  const furthestEnd =
    periodEnds["7d"] > periodEnds.end_of_month
      ? periodEnds["7d"]
      : periodEnds.end_of_month;

  // Parallel fetches
  const [remindersResult, paymentsResult] = await Promise.all([
    supabase
      .from("reminders")
      .select("id, amount, due_date, frequency")
      .order("due_date", { ascending: true }),
    supabase
      .from("reminder_payments")
      .select("reminder_id, due_date")
      .gte("due_date", overdueStart)
      .lte("due_date", furthestEnd),
  ]);

  if (remindersResult.error) {
    throw new Error(`Failed to fetch reminders: ${remindersResult.error.message}`);
  }
  if (paymentsResult.error) {
    throw new Error(`Failed to fetch payments: ${paymentsResult.error.message}`);
  }

  const paidSet = new Set(
    (paymentsResult.data ?? []).map((p) => `${p.reminder_id}:${p.due_date}`)
  );

  // Initialize accumulators
  const byPeriod: Record<ReminderPeriod, PeriodStats> = {
    "7d": { count: 0 },
    end_of_month: { count: 0 },
  };
  let overdueCount = 0;

  for (const rem of remindersResult.data ?? []) {
    // Generate occurrences from the overdue lookback to the furthest period end
    const occurrences = generateOccurrences(
      rem.due_date,
      rem.frequency,
      overdueStart,
      furthestEnd
    );

    // Only count the next upcoming per reminder (not all future)
    let foundNextUpcoming = false;

    for (const dueDate of occurrences) {
      const key = `${rem.id}:${dueDate}`;
      if (paidSet.has(key)) continue;

      if (dueDate < today) {
        // Overdue
        overdueCount++;
      } else {
        // Upcoming — only count the first per reminder
        if (foundNextUpcoming) continue;
        foundNextUpcoming = true;

        // Add to each period this occurrence falls within
        for (const p of (Object.keys(periodEnds) as ReminderPeriod[])) {
          if (dueDate <= periodEnds[p]) {
            byPeriod[p].count++;
          }
        }
      }
    }
  }

  return { byPeriod, overdueCount };
}

// ────────────────────────────────────────────
// Fetch expense categories for reminder form
// ────────────────────────────────────────────

export async function fetchReminderCategories(): Promise<CategoryOption[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, icon, color, type, group_id, category_groups(name)")
    .eq("type", "expense")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data ?? []).map((cat) => {
    const group = parseGroupJoin(cat.category_groups);
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: "expense" as const,
      group_id: cat.group_id,
      group_name: group?.name ?? null,
    };
  });
}


