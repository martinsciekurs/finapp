/**
 * Check whether a target date is a valid occurrence of a recurrence
 * starting at `startDate` with the given `frequency`.
 *
 * Handles end-of-month clamping (e.g. a monthly reminder starting Jan 31
 * is valid on Feb 28/29, Apr 30, etc.).
 */
export function isValidOccurrence(
  startDate: string, // YYYY-MM-DD (reminder's due_date / anchor)
  frequency: string, // "one_time" | "weekly" | "monthly" | "yearly"
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
    const lastDay = new Date(targetY, targetM, 0).getDate();
    const expectedDay = Math.min(startD, lastDay);
    return targetD === expectedDay;
  }

  if (frequency === "yearly") {
    if (targetM !== startM) return false;
    const lastDay = new Date(targetY, targetM, 0).getDate();
    const expectedDay = Math.min(startD, lastDay);
    return targetD === expectedDay;
  }

  return false;
}
