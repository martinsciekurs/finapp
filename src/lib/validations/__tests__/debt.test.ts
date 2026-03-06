import { describe, expect, it } from "vitest";

import {
  createDebtSchema,
  updateDebtSchema,
  createDebtPaymentSchema,
  updateDebtPaymentSchema,
  deleteDebtSchema,
  deleteDebtPaymentSchema,
} from "../debt";

const validDebtId = "550e8400-e29b-41d4-a716-446655440000";
const validCategoryId = "660e8400-e29b-41d4-a716-446655440000";
const validPaymentId = "770e8400-e29b-41d4-a716-446655440000";

describe("createDebtSchema", () => {
  const validData = {
    counterparty: "John",
    type: "i_owe" as const,
    category_id: validCategoryId,
    debt_date: "2026-03-06",
    original_amount: 100,
    description: "Lunch split",
  };

  it("accepts valid debt data", () => {
    expect(createDebtSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects missing category", () => {
    const result = createDebtSchema.safeParse({
      ...validData,
      category_id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid debt date", () => {
    const result = createDebtSchema.safeParse({
      ...validData,
      debt_date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("rejects amount with more than 2 decimals", () => {
    const result = createDebtSchema.safeParse({
      ...validData,
      original_amount: 12.345,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDebtSchema", () => {
  const validData = {
    id: validDebtId,
    counterparty: "John",
    type: "i_owe" as const,
    category_id: validCategoryId,
    debt_date: "2026-03-06",
    original_amount: 100,
    description: "",
  };

  it("accepts valid update payload", () => {
    expect(updateDebtSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects invalid debt id", () => {
    const result = updateDebtSchema.safeParse({ ...validData, id: "bad" });
    expect(result.success).toBe(false);
  });

  it("accepts empty category_id for deleted categories", () => {
    const result = updateDebtSchema.safeParse({ ...validData, category_id: "" });
    expect(result.success).toBe(true);
  });
});

describe("createDebtPaymentSchema", () => {
  const validData = {
    debt_id: validDebtId,
    amount: 20,
    payment_date: "2026-03-06",
    note: "Partial payment",
  };

  it("accepts valid payment", () => {
    expect(createDebtPaymentSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects invalid debt id", () => {
    expect(
      createDebtPaymentSchema.safeParse({ ...validData, debt_id: "bad" }).success
    ).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      createDebtPaymentSchema.safeParse({ ...validData, amount: 0 }).success
    ).toBe(false);
  });
});

describe("updateDebtPaymentSchema", () => {
  it("accepts valid update payload", () => {
    expect(
      updateDebtPaymentSchema.safeParse({
        id: validPaymentId,
        amount: 50,
        payment_date: "2026-03-06",
        note: "Updated note",
      }).success
    ).toBe(true);
  });

  it("rejects invalid payment id", () => {
    expect(
      updateDebtPaymentSchema.safeParse({
        id: "bad",
        amount: 50,
        payment_date: "2026-03-06",
        note: "",
      }).success
    ).toBe(false);
  });
});

describe("delete schemas", () => {
  it("deleteDebtSchema accepts valid id", () => {
    expect(deleteDebtSchema.safeParse({ id: validDebtId }).success).toBe(true);
  });

  it("deleteDebtPaymentSchema accepts valid id", () => {
    expect(
      deleteDebtPaymentSchema.safeParse({ id: validPaymentId }).success
    ).toBe(true);
  });
});
