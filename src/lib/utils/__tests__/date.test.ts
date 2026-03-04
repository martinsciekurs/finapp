import { describe, it, expect, vi, afterEach } from "vitest";
import {
  formatDate,
  formatRelativeTime,
  formatDateForInput,
  getCurrentMonthRange,
  getLast7DaysStart,
  getCurrentMonthLabel,
} from "../date";

describe("formatDate", () => {
  it("formats ISO date string to readable format", () => {
    expect(formatDate("2026-03-04")).toBe("Mar 4, 2026");
  });

  it("formats January date correctly", () => {
    expect(formatDate("2026-01-15")).toBe("Jan 15, 2026");
  });

  it("formats December date correctly", () => {
    expect(formatDate("2025-12-31")).toBe("Dec 31, 2025");
  });

  it("accepts custom Intl options", () => {
    const result = formatDate("2026-03-04", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    expect(result).toContain("March");
    expect(result).toContain("4");
    expect(result).toContain("Wednesday");
  });
});

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" for today\'s date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00"));
    expect(formatRelativeTime("2026-03-04")).toBe("Today");
  });

  it('returns "Yesterday" for yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00"));
    expect(formatRelativeTime("2026-03-03")).toBe("Yesterday");
  });

  it('returns "X days ago" for recent dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T12:00:00"));
    expect(formatRelativeTime("2026-03-01")).toBe("3 days ago");
  });

  it('returns "1 week ago" for 7-13 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-14T12:00:00"));
    expect(formatRelativeTime("2026-03-04")).toBe("1 week ago");
  });

  it('returns "X weeks ago" for 14-29 days', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-20T12:00:00"));
    expect(formatRelativeTime("2026-03-04")).toBe("2 weeks ago");
  });

  it("falls back to formatted date for older dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-15T12:00:00"));
    expect(formatRelativeTime("2026-03-04")).toBe("Mar 4, 2026");
  });
});

describe("formatDateForInput", () => {
  it("formats date string to YYYY-MM-DD", () => {
    expect(formatDateForInput("2026-03-04")).toBe("2026-03-04");
  });

  it("pads single-digit month and day", () => {
    expect(formatDateForInput("2026-01-05")).toBe("2026-01-05");
  });

  it("accepts a Date object", () => {
    const date = new Date(2026, 2, 4); // March 4, 2026
    expect(formatDateForInput(date)).toBe("2026-03-04");
  });
});

describe("getCurrentMonthRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns correct range for March 2026", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
    const { start, end } = getCurrentMonthRange();
    expect(start).toBe("2026-03-01");
    expect(end).toBe("2026-04-01");
  });

  it("handles year boundary (December -> January)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-15T12:00:00"));
    const { start, end } = getCurrentMonthRange();
    expect(start).toBe("2025-12-01");
    expect(end).toBe("2026-01-01");
  });

  it("handles January", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00"));
    const { start, end } = getCurrentMonthRange();
    expect(start).toBe("2026-01-01");
    expect(end).toBe("2026-02-01");
  });
});

describe("getLast7DaysStart", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns date 6 days before today (inclusive 7-day window)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-10T12:00:00"));
    expect(getLast7DaysStart()).toBe("2026-03-04");
  });

  it("handles month boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-03T12:00:00"));
    expect(getLast7DaysStart()).toBe("2026-02-25");
  });

  it("handles year boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T12:00:00"));
    expect(getLast7DaysStart()).toBe("2025-12-27");
  });
});

describe("getCurrentMonthLabel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns human-readable month label", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T12:00:00"));
    expect(getCurrentMonthLabel()).toBe("March 2026");
  });

  it("returns correct label for December", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-12-01T12:00:00"));
    expect(getCurrentMonthLabel()).toBe("December 2025");
  });
});
