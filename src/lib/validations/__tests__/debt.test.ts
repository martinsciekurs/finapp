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

  it("accepts they_owe type", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "Jane",
      type: "they_owe",
      original_amount: 50,
    });
    expect(result.success).toBe(true);
  });

  it("rejects zero amount", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "i_owe",
      original_amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rejects counterparty over 100 characters", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "a".repeat(101),
      type: "i_owe",
      original_amount: 100,
    });
    expect(result.success).toBe(false);
  });

  it("accepts counterparty at exactly 100 characters", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "a".repeat(100),
      type: "i_owe",
      original_amount: 100,
    });
    expect(result.success).toBe(true);
  });

  it("rejects description over 500 characters", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "i_owe",
      original_amount: 100,
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts description at exactly 500 characters", () => {
    const result = createDebtSchema.safeParse({
      counterparty: "John",
      type: "i_owe",
      original_amount: 100,
      description: "a".repeat(500),
    });
    expect(result.success).toBe(true);
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

  it("rejects negative payment", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -10,
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID for debt_id", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "not-a-uuid",
      amount: 50,
    });
    expect(result.success).toBe(false);
  });

  it("rejects note over 500 characters", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50,
      note: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts note at exactly 500 characters", () => {
    const result = createDebtPaymentSchema.safeParse({
      debt_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 50,
      note: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });
});
