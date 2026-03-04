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

  it("both tiers have maxAttachments set to 3", () => {
    expect(PLAN_LIMITS.free.maxAttachments).toBe(3);
    expect(PLAN_LIMITS.pro.maxAttachments).toBe(3);
  });

  it("both tiers have maxAttachmentSize of 5MB", () => {
    const fiveMB = 5 * 1024 * 1024;
    expect(PLAN_LIMITS.free.maxAttachmentSize).toBe(fiveMB);
    expect(PLAN_LIMITS.pro.maxAttachmentSize).toBe(fiveMB);
  });

  it("free tier has positive AI credits per day", () => {
    expect(PLAN_LIMITS.free.aiCreditsPerDay).toBeGreaterThan(0);
    expect(Number.isFinite(PLAN_LIMITS.free.aiCreditsPerDay)).toBe(true);
  });

  it("pro tier has higher AI credits than free tier", () => {
    expect(PLAN_LIMITS.pro.aiCreditsPerDay).toBeGreaterThan(
      PLAN_LIMITS.free.aiCreditsPerDay
    );
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

/**
 * safeParseInt is a private function, but we test its behavior indirectly
 * via PLAN_LIMITS. The env vars are read at module load time, so to test
 * safeParseInt edge cases we'd need to re-import the module with different
 * env vars. Instead we verify the default fallback values are used when no
 * env vars are set (which is the test environment).
 */
describe("safeParseInt (indirect via defaults)", () => {
  it("uses default of 40 for free transactions when env is unset", () => {
    // In test env, LIMIT_FREE_TRANSACTIONS_PER_MONTH is not set
    expect(PLAN_LIMITS.free.transactionsPerMonth).toBe(40);
  });

  it("uses default of 15 for free AI credits when env is unset", () => {
    expect(PLAN_LIMITS.free.aiCreditsPerDay).toBe(15);
  });

  it("uses default of 500 for pro AI credits when env is unset", () => {
    expect(PLAN_LIMITS.pro.aiCreditsPerDay).toBe(500);
  });
});
