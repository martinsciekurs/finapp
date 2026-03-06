import type { ReminderFrequency } from "@/lib/types/reminder";

/**
 * Clamp a day number to the last day of a given month.
 * Handles end-of-month drift (e.g., day 31 in February → 28/29).
 */
export function clampDayToMonth(
  year: number,
  month: number,
  day: number
): number {
  const lastDay = new Date(year, month, 0).getDate();
  return Math.min(day, lastDay);
}

/**
 * Check whether a target date is a valid occurrence of a recurrence
 * starting at `startDate` with the given `frequency`.
 *
 * Handles end-of-month clamping (e.g. a monthly reminder starting Jan 31
 * is valid on Feb 28/29, Apr 30, etc.).
 */
export function isValidOccurrence(
  startDate: string, // YYYY-MM-DD (reminder's due_date / anchor)
  frequency: ReminderFrequency,
  targetDate: string // YYYY-MM-DD (the date being validated)
): boolean {
  // Target cannot be before the reminder's start
  if (targetDate < startDate) return false;

  // The start date itself is always valid
  if (targetDate === startDate) return true;

  if (frequency === "one_time") return false;

  const [startY, startM, startD] = startDate.split("-").map(Number);
  const [targetY, targetM, targetD] = targetDate.split("-").map(Number);

  if (frequency === "weekly") {
    const start = new Date(startY, startM - 1, startD);
    const target = new Date(targetY, targetM - 1, targetD);
    const diffDays = Math.round(
      (target.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays % 7 === 0;
  }

  if (frequency === "monthly") {
    return targetD === clampDayToMonth(targetY, targetM, startD);
  }

  if (frequency === "yearly") {
    if (targetM !== startM) return false;
    return targetD === clampDayToMonth(targetY, targetM, startD);
  }

  return false;
}
