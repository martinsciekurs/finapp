import { describe, it, expect } from "vitest";
import { isValidOccurrence } from "../recurrence";

describe("isValidOccurrence", () => {
  // ── General ──────────────────────────────────────────────

  it("returns true when target equals start date (any frequency)", () => {
    expect(isValidOccurrence("2026-04-01", "monthly", "2026-04-01")).toBe(true);
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-01")).toBe(true);
    expect(isValidOccurrence("2026-04-01", "yearly", "2026-04-01")).toBe(true);
    expect(isValidOccurrence("2026-04-01", "one_time", "2026-04-01")).toBe(true);
  });

  it("returns false when target is before start date", () => {
    expect(isValidOccurrence("2026-04-01", "monthly", "2026-03-31")).toBe(false);
  });

  it("returns false for unknown frequency", () => {
    expect(isValidOccurrence("2026-04-01", "daily", "2026-04-02")).toBe(false);
  });

  // ── One-time ─────────────────────────────────────────────

  it("one_time: rejects any date after start", () => {
    expect(isValidOccurrence("2026-04-01", "one_time", "2026-04-02")).toBe(false);
    expect(isValidOccurrence("2026-04-01", "one_time", "2027-04-01")).toBe(false);
  });

  // ── Weekly ───────────────────────────────────────────────

  it("weekly: accepts exactly N*7 days later", () => {
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-08")).toBe(true);
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-15")).toBe(true);
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-22")).toBe(true);
  });

  it("weekly: rejects non-multiple-of-7 day offsets", () => {
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-02")).toBe(false);
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-09")).toBe(false);
    expect(isValidOccurrence("2026-04-01", "weekly", "2026-04-14")).toBe(false);
  });

  // ── Monthly ──────────────────────────────────────────────

  it("monthly: accepts the same day of subsequent months", () => {
    expect(isValidOccurrence("2026-01-15", "monthly", "2026-02-15")).toBe(true);
    expect(isValidOccurrence("2026-01-15", "monthly", "2026-06-15")).toBe(true);
    expect(isValidOccurrence("2026-01-15", "monthly", "2027-01-15")).toBe(true);
  });

  it("monthly: rejects a different day of the month", () => {
    expect(isValidOccurrence("2026-01-15", "monthly", "2026-02-14")).toBe(false);
    expect(isValidOccurrence("2026-01-15", "monthly", "2026-02-16")).toBe(false);
  });

  it("monthly: clamps to last day when month has fewer days", () => {
    // Jan 31 → Feb 28 (non-leap), Apr 30
    expect(isValidOccurrence("2026-01-31", "monthly", "2026-02-28")).toBe(true);
    expect(isValidOccurrence("2026-01-31", "monthly", "2026-04-30")).toBe(true);
    expect(isValidOccurrence("2026-01-31", "monthly", "2026-03-31")).toBe(true);
    // Should NOT accept Feb 27 or Mar 30 when start is 31
    expect(isValidOccurrence("2026-01-31", "monthly", "2026-02-27")).toBe(false);
    expect(isValidOccurrence("2026-01-31", "monthly", "2026-03-30")).toBe(false);
  });

  it("monthly: handles leap year Feb clamping", () => {
    // Jan 31 → Feb 29 in leap year 2028
    expect(isValidOccurrence("2028-01-31", "monthly", "2028-02-29")).toBe(true);
    expect(isValidOccurrence("2028-01-31", "monthly", "2028-02-28")).toBe(false);
  });

  // ── Yearly ───────────────────────────────────────────────

  it("yearly: accepts the same month and day in future years", () => {
    expect(isValidOccurrence("2026-04-15", "yearly", "2027-04-15")).toBe(true);
    expect(isValidOccurrence("2026-04-15", "yearly", "2030-04-15")).toBe(true);
  });

  it("yearly: rejects a different month", () => {
    expect(isValidOccurrence("2026-04-15", "yearly", "2027-05-15")).toBe(false);
  });

  it("yearly: rejects a different day in the same month", () => {
    expect(isValidOccurrence("2026-04-15", "yearly", "2027-04-16")).toBe(false);
  });

  it("yearly: clamps Feb 29 to Feb 28 in non-leap years", () => {
    expect(isValidOccurrence("2024-02-29", "yearly", "2025-02-28")).toBe(true);
    expect(isValidOccurrence("2024-02-29", "yearly", "2028-02-29")).toBe(true);
    expect(isValidOccurrence("2024-02-29", "yearly", "2025-03-01")).toBe(false);
  });
});
