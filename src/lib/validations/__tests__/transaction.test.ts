import { describe, it, expect } from "vitest";
import {
  createTransactionSchema,
  updateTransactionSchema,
  transactionSourceEnum,
  transactionFormSchema,
} from "../transaction";

describe("createTransactionSchema", () => {
  it("accepts a valid expense transaction", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 45.5,
      type: "expense",
      description: "Lunch with team",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid income transaction", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 200,
      type: "income",
      description: "Freelance payment",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amounts", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 0,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "transfer",
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid category_id", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "not-a-uuid",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("defaults source to web", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("web");
    }
  });

  it("defaults ai_generated to false", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai_generated).toBe(false);
    }
  });

  it("rejects description over 500 characters", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("accepts telegram source", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      source: "telegram",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("telegram");
    }
  });

  it("accepts voice source", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      source: "voice",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.source).toBe("voice");
    }
  });

  it("rejects invalid source", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      source: "sms",
    });
    expect(result.success).toBe(false);
  });

  it("accepts explicit ai_generated true", () => {
    const result = createTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      ai_generated: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.ai_generated).toBe(true);
    }
  });
});

describe("transactionSourceEnum", () => {
  it("accepts all valid sources", () => {
    for (const source of ["web", "telegram", "voice"]) {
      expect(transactionSourceEnum.safeParse(source).success).toBe(true);
    }
  });

  it("rejects invalid source", () => {
    expect(transactionSourceEnum.safeParse("email").success).toBe(false);
  });
});

describe("updateTransactionSchema", () => {
  it("accepts a partial update with only amount", () => {
    const result = updateTransactionSchema.safeParse({ amount: 99.99 });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (all fields optional) without materializing defaults", () => {
    const result = updateTransactionSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("validates field constraints when present", () => {
    const result = updateTransactionSchema.safeParse({ amount: -5 });
    expect(result.success).toBe(false);
  });

  it("validates type when present", () => {
    const result = updateTransactionSchema.safeParse({ type: "transfer" });
    expect(result.success).toBe(false);
  });

  it("validates category_id when present", () => {
    const result = updateTransactionSchema.safeParse({ category_id: "not-uuid" });
    expect(result.success).toBe(false);
  });

  it("validates date when present", () => {
    const result = updateTransactionSchema.safeParse({ date: "invalid" });
    expect(result.success).toBe(false);
  });

  it("accepts a full update with all fields", () => {
    const result = updateTransactionSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 200,
      type: "income",
      description: "Updated",
      date: "2026-03-04",
      source: "telegram",
      ai_generated: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("transactionFormSchema", () => {
  it("accepts a valid expense form submission", () => {
    const result = transactionFormSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 45.5,
      type: "expense",
      description: "Lunch with team",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a valid income form submission", () => {
    const result = transactionFormSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 200,
      type: "income",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = transactionFormSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: -10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = transactionFormSchema.safeParse({
      description: "Just a description",
    });
    expect(result.success).toBe(false);
  });

  it("does not include source or ai_generated fields", () => {
    const result = transactionFormSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
      source: "web",
      ai_generated: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      // Extra fields are stripped by Zod
      expect("source" in result.data).toBe(false);
      expect("ai_generated" in result.data).toBe(false);
    }
  });

  it("allows optional description", () => {
    const result = transactionFormSchema.safeParse({
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      amount: 10,
      type: "expense",
      date: "2026-03-04",
    });
    expect(result.success).toBe(true);
  });
});
