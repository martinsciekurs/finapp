import { describe, it, expect } from "vitest";
import { PLAN_LIMITS, getPlanLimits } from "../limits";

describe("PLAN_LIMITS", () => {
  it("free tier has finite transaction limit", () => {
    expect(PLAN_LIMITS.free.transactionsPerMonth).toBeGreaterThan(0);
    expect(Number.isFinite(PLAN_LIMITS.free.transactionsPerMonth)).toBe(true);
  });

  it("pro tier has unlimited transactions", () => {
    expect(PLAN_LIMITS.pro.transactionsPerMonth).toBe(Infinity);
  });

  it("free tier does not enable telegram", () => {
    expect(PLAN_LIMITS.free.telegramEnabled).toBe(false);
  });

  it("pro tier enables telegram", () => {
    expect(PLAN_LIMITS.pro.telegramEnabled).toBe(true);
  });
});

describe("getPlanLimits", () => {
  it("returns free limits", () => {
    expect(getPlanLimits("free")).toBe(PLAN_LIMITS.free);
  });

  it("returns pro limits", () => {
    expect(getPlanLimits("pro")).toBe(PLAN_LIMITS.pro);
  });
});
