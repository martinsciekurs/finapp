/**
 * Date formatting utilities.
 *
 * Uses native `Intl.DateTimeFormat` — no date-fns dependency needed.
 */

/**
 * Format a date string for display.
 *
 * @param dateStr  ISO date string (e.g. "2026-03-04")
 * @param options  Optional Intl.DateTimeFormatOptions override
 * @returns Formatted date, e.g. "Mar 4, 2026"
 */
export function formatDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const date = new Date(dateStr + "T00:00:00"); // Prevent timezone shift
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  return new Intl.DateTimeFormat("en-US", options ?? defaultOptions).format(
    date
  );
}

/**
 * Format a date as a relative time string (e.g. "Today", "Yesterday", "3 days ago").
 *
 * @param dateStr  ISO date string
 * @returns Human-readable relative date
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Future dates
  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return "Tomorrow";
    return `in ${absDays} days`;
  }

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 week ago" : `${weeks} weeks ago`;
  }
  return formatDate(dateStr);
}

/**
 * Format a date string for an HTML date input value.
 *
 * @param dateStr  ISO date string or Date
 * @returns "YYYY-MM-DD" string
 */
export function formatDateForInput(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr + "T00:00:00") : dateStr;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the start and end dates of the current month in ISO format.
 *
 * @returns `{ start: "YYYY-MM-DD", end: "YYYY-MM-DD" }` where `end` is
 *          the first day of the next month (exclusive upper bound for queries).
 */
export function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed

  const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;

  // First day of next month
  const nextMonth = new Date(year, month + 1, 1);
  const endYear = nextMonth.getFullYear();
  const endMonth = nextMonth.getMonth();
  const end = `${endYear}-${String(endMonth + 1).padStart(2, "0")}-01`;

  return { start, end };
}

/**
 * Get the start date for a "last 7 days" query window.
 *
 * @returns ISO date string 7 days ago (inclusive), e.g. "2026-02-25"
 */
export function getLast7DaysStart(): string {
  const now = new Date();
  const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
  const year = past.getFullYear();
  const month = String(past.getMonth() + 1).padStart(2, "0");
  const day = String(past.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a human-readable label for the current month.
 *
 * @returns e.g. "March 2026"
 */
export function getCurrentMonthLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date());
}
