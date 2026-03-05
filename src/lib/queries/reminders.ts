import "server-only";

import { createClient } from "@/lib/supabase/server";
import { formatDateForInput } from "@/lib/utils/date";
import type {
  ReminderData,
  ReminderOccurrence,
  OccurrenceStatus,
  GroupedOccurrences,
  ReminderPeriod,
  PeriodStats,
  UpcomingRemindersData,
} from "@/lib/types/reminder";
import type { CategoryOption } from "@/lib/types/transactions";

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
  if (period === "30d") {
    const d = new Date(now);
    d.setDate(d.getDate() + 30);
    return formatDateForInput(d);
  }
  // end_of_month
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return formatDateForInput(d);
}

/**
 * Generate occurrence dates for a reminder within a date range.
 * Returns an array of YYYY-MM-DD strings.
 */
function generateOccurrences(
  startDate: string,
  frequency: string,
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

  // Parse starting date
  const [y, m, d] = startDate.split("-").map(Number);
  const current = new Date(y, m - 1, d);
  const end = new Date(rangeEnd + "T23:59:59");

  // The effective start of the range is the later of rangeStart and
  // the reminder's own startDate — we never generate occurrences
  // before the reminder existed.
  const effectiveStart = startDate > rangeStart ? startDate : rangeStart;
  const effectiveStartDate = new Date(effectiveStart + "T00:00:00");

  // Advance forward from the reminder's due_date until we reach
  // the effective start of the window.
  const maxIterations = 500; // safety limit
  let iterations = 0;
  while (current < effectiveStartDate && iterations < maxIterations) {
    if (frequency === "weekly") current.setDate(current.getDate() + 7);
    else if (frequency === "monthly") current.setMonth(current.getMonth() + 1);
    else if (frequency === "yearly") current.setFullYear(current.getFullYear() + 1);
    iterations++;
  }

  // If we overshot, step back one period so we don't skip the
  // first occurrence that falls within the window.
  if (current > effectiveStartDate) {
    if (frequency === "weekly") current.setDate(current.getDate() - 7);
    else if (frequency === "monthly") current.setMonth(current.getMonth() - 1);
    else if (frequency === "yearly") current.setFullYear(current.getFullYear() - 1);
  }

  // Generate forward from current
  iterations = 0;
  while (current <= end && iterations < maxIterations) {
    const dateStr = formatDateForInput(current);
    if (dateStr >= effectiveStart && dateStr <= rangeEnd) {
      dates.push(dateStr);
    }
    if (frequency === "weekly") current.setDate(current.getDate() + 7);
    else if (frequency === "monthly") current.setMonth(current.getMonth() + 1);
    else if (frequency === "yearly") current.setFullYear(current.getFullYear() + 1);
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
        "id, title, amount, due_date, frequency, is_paid, auto_create_transaction, category_id, categories(name, icon, color)"
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
    const cat = row.categories as unknown as {
      name: string;
      icon: string;
      color: string;
    } | null;

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
        category_name: cat?.name ?? null,
        category_icon: cat?.icon ?? null,
        category_color: cat?.color ?? null,
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
      "id, title, amount, due_date, frequency, is_paid, auto_create_transaction, category_id, categories(name, icon, color)"
    )
    .order("title", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch reminders: ${error.message}`);
  }

  return (data ?? []).map((row) => {
    const cat = row.categories as unknown as {
      name: string;
      icon: string;
      color: string;
    } | null;

    return {
      id: row.id,
      title: row.title,
      amount: row.amount,
      due_date: row.due_date,
      frequency: row.frequency,
      is_paid: row.is_paid,
      auto_create_transaction: row.auto_create_transaction,
      category_id: row.category_id,
      category_name: cat?.name ?? null,
      category_icon: cat?.icon ?? null,
      category_color: cat?.color ?? null,
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
  const periods: ReminderPeriod[] = ["7d", "30d", "end_of_month"];
  const periodEnds: Record<ReminderPeriod, string> = {
    "7d": getPeriodEnd("7d"),
    "30d": getPeriodEnd("30d"),
    end_of_month: getPeriodEnd("end_of_month"),
  };

  // The widest window covers all periods + overdue lookback (3 months)
  const now = new Date();
  const overdueStart = formatDateForInput(
    new Date(now.getFullYear(), now.getMonth() - 3, 1)
  );
  const furthestEnd = Object.values(periodEnds).sort().pop()!;

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
    "7d": { count: 0, totalAmount: 0 },
    "30d": { count: 0, totalAmount: 0 },
    end_of_month: { count: 0, totalAmount: 0 },
  };
  let overdueCount = 0;
  let nextDueDays: number | null = null;

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

        const diff = daysDiff(dueDate, today);
        if (nextDueDays === null || diff < nextDueDays) {
          nextDueDays = diff;
        }

        // Add to each period this occurrence falls within
        for (const p of periods) {
          if (dueDate <= periodEnds[p]) {
            byPeriod[p].count++;
            byPeriod[p].totalAmount += rem.amount;
          }
        }
      }
    }
  }

  return { byPeriod, overdueCount, nextDueDays };
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
    const group = cat.category_groups as unknown as { name: string } | null;
    return {
      id: cat.id,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      type: cat.type as "expense" | "income",
      group_id: cat.group_id,
      group_name: group?.name ?? null,
    };
  });
}

// ────────────────────────────────────────────
// Fetch user currency
// ────────────────────────────────────────────

export async function fetchReminderCurrency(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return "EUR";

  const { data } = await supabase
    .from("profiles")
    .select("currency")
    .eq("id", user.id)
    .maybeSingle();

  return data?.currency ?? "EUR";
}
