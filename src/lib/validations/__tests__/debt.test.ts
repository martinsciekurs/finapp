import { describe, it, expect } from "vitest";
import { createDebtSchema, createDebtPaymentSchema } from "../debt";

describe("createDebtSchema", () => {
  it("accepts a valid debt", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "i_owe",
      original_amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "i_owe",
      original_amount: -50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty counterparty", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "",
      type: "they_owe",
      original_amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "unknown",
      original_amount: 100,
    });
    expect(result.success).toBe(false);
  });
});

describe("createDebtPaymentSchema", () => {
  it("accepts a valid payment", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero payment", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });
});
