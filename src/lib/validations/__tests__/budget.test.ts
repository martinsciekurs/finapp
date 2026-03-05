import { describe, it, expect } from "vitest";
import {
  yearMonthSchema,
  upsertCategoryBudgetSchema,
  removeCategoryBudgetSchema,
  bulkUpsertCategoryBudgetsSchema,
  upsertIncomeTargetSchema,
  removeIncomeTargetSchema,
} from "../budget";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

// ---------------------------------------------------------------------------
// yearMonthSchema
// ---------------------------------------------------------------------------

describe("yearMonthSchema", () => {
  it("accepts valid year-month strings", () => {
    expect(yearMonthSchema.safeParse("2026-01").success).toBe(true);
    expect(yearMonthSchema.safeParse("2026-12").success).toBe(true);
    expect(yearMonthSchema.safeParse("2000-06").success).toBe(true);
    expect(yearMonthSchema.safeParse("1999-01").success).toBe(true);
  });

  it("rejects invalid month values", () => {
    expect(yearMonthSchema.safeParse("2026-00").success).toBe(false);
    expect(yearMonthSchema.safeParse("2026-13").success).toBe(false);
  });

  it("rejects invalid formats", () => {
    expect(yearMonthSchema.safeParse("2026-1").success).toBe(false);
    expect(yearMonthSchema.safeParse("202-01").success).toBe(false);
    expect(yearMonthSchema.safeParse("2026/01").success).toBe(false);
    expect(yearMonthSchema.safeParse("January 2026").success).toBe(false);
    expect(yearMonthSchema.safeParse("").success).toBe(false);
  });

  it("rejects non-string values", () => {
    expect(yearMonthSchema.safeParse(202601).success).toBe(false);
    expect(yearMonthSchema.safeParse(null).success).toBe(false);
  });

  it("includes a descriptive error message", () => {
    const result = yearMonthSchema.safeParse("bad");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("YYYY-MM");
    }
  });
});

// ---------------------------------------------------------------------------
// upsertCategoryBudgetSchema
// ---------------------------------------------------------------------------

describe("upsertCategoryBudgetSchema", () => {
  const validData = {
    categoryId: validUuid,
    yearMonth: "2026-03",
    amount: 500,
  };

  it("accepts valid data", () => {
    expect(upsertCategoryBudgetSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects missing categoryId", () => {
    const { categoryId: _, ...rest } = validData;
    expect(upsertCategoryBudgetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid UUID for categoryId", () => {
    expect(
      upsertCategoryBudgetSchema.safeParse({ ...validData, categoryId: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects missing yearMonth", () => {
    const { yearMonth: _, ...rest } = validData;
    expect(upsertCategoryBudgetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid yearMonth format", () => {
    expect(
      upsertCategoryBudgetSchema.safeParse({ ...validData, yearMonth: "2026-13" }).success
    ).toBe(false);
  });

  it("rejects missing amount", () => {
    const { amount: _, ...rest } = validData;
    expect(upsertCategoryBudgetSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      upsertCategoryBudgetSchema.safeParse({ ...validData, amount: 0 }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      upsertCategoryBudgetSchema.safeParse({ ...validData, amount: -100 }).success
    ).toBe(false);
  });

  it("accepts decimal amount", () => {
    expect(
      upsertCategoryBudgetSchema.safeParse({ ...validData, amount: 99.99 }).success
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// removeCategoryBudgetSchema
// ---------------------------------------------------------------------------

describe("removeCategoryBudgetSchema", () => {
  it("accepts valid data", () => {
    expect(
      removeCategoryBudgetSchema.safeParse({ categoryId: validUuid, yearMonth: "2026-03" }).success
    ).toBe(true);
  });

  it("rejects invalid UUID", () => {
    expect(
      removeCategoryBudgetSchema.safeParse({ categoryId: "bad", yearMonth: "2026-03" }).success
    ).toBe(false);
  });

  it("rejects invalid yearMonth", () => {
    expect(
      removeCategoryBudgetSchema.safeParse({ categoryId: validUuid, yearMonth: "bad" }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bulkUpsertCategoryBudgetsSchema
// ---------------------------------------------------------------------------

describe("bulkUpsertCategoryBudgetsSchema", () => {
  const validItem = {
    categoryId: validUuid,
    yearMonth: "2026-03",
    amount: 200,
  };

  it("accepts valid array of items", () => {
    expect(
      bulkUpsertCategoryBudgetsSchema.safeParse({ items: [validItem] }).success
    ).toBe(true);
  });

  it("accepts multiple items", () => {
    expect(
      bulkUpsertCategoryBudgetsSchema.safeParse({
        items: [validItem, { ...validItem, yearMonth: "2026-04" }],
      }).success
    ).toBe(true);
  });

  it("rejects empty array", () => {
    expect(
      bulkUpsertCategoryBudgetsSchema.safeParse({ items: [] }).success
    ).toBe(false);
  });

  it("rejects items with invalid data", () => {
    expect(
      bulkUpsertCategoryBudgetsSchema.safeParse({
        items: [{ categoryId: "bad", yearMonth: "2026-03", amount: 100 }],
      }).success
    ).toBe(false);
  });

  it("rejects items with negative amount", () => {
    expect(
      bulkUpsertCategoryBudgetsSchema.safeParse({
        items: [{ ...validItem, amount: -10 }],
      }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// upsertIncomeTargetSchema
// ---------------------------------------------------------------------------

describe("upsertIncomeTargetSchema", () => {
  it("accepts valid data", () => {
    expect(
      upsertIncomeTargetSchema.safeParse({ yearMonth: "2026-03", amount: 5000 }).success
    ).toBe(true);
  });

  it("rejects missing yearMonth", () => {
    expect(upsertIncomeTargetSchema.safeParse({ amount: 5000 }).success).toBe(false);
  });

  it("rejects missing amount", () => {
    expect(upsertIncomeTargetSchema.safeParse({ yearMonth: "2026-03" }).success).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      upsertIncomeTargetSchema.safeParse({ yearMonth: "2026-03", amount: 0 }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      upsertIncomeTargetSchema.safeParse({ yearMonth: "2026-03", amount: -1000 }).success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// removeIncomeTargetSchema
// ---------------------------------------------------------------------------

describe("removeIncomeTargetSchema", () => {
  it("accepts valid data", () => {
    expect(removeIncomeTargetSchema.safeParse({ yearMonth: "2026-03" }).success).toBe(true);
  });

  it("rejects invalid yearMonth", () => {
    expect(removeIncomeTargetSchema.safeParse({ yearMonth: "not-valid" }).success).toBe(false);
  });

  it("rejects missing yearMonth", () => {
    expect(removeIncomeTargetSchema.safeParse({}).success).toBe(false);
  });
});
