import { describe, it, expect } from "vitest";
import {
  aiAssistantResponseSchema,
  aiChatRequestSchema,
  aiInputSchema,
  aiSuggestionSchema,
  aiTransactionDraftSchema,
} from "../ai";

describe("aiInputSchema", () => {
  it("accepts valid input", () => {
    const result = aiInputSchema.safeParse({
      text: "45 dollars lunch with team at the restaurant",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty input", () => {
    const result = aiInputSchema.safeParse({ text: "" });
    expect(result.success).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = aiInputSchema.safeParse({ text: "   " });
    expect(result.success).toBe(false);
  });

  it("trims leading and trailing whitespace", () => {
    const result = aiInputSchema.safeParse({ text: "  hello world  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.text).toBe("hello world");
    }
  });

  it("rejects input over 1000 characters", () => {
    const result = aiInputSchema.safeParse({ text: "a".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 100 words", () => {
    const words = Array(100).fill("word").join(" ");
    const result = aiInputSchema.safeParse({ text: words });
    expect(result.success).toBe(true);
  });

  it("rejects over 100 words", () => {
    const words = Array(101).fill("word").join(" ");
    const result = aiInputSchema.safeParse({ text: words });
    expect(result.success).toBe(false);
  });
});

describe("aiSuggestionSchema", () => {
  it("accepts a valid suggestion with all fields", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: 45.5,
      category: "Groceries",
      description: "Weekly grocery shopping",
      confidence: 0.85,
    });
    expect(result.success).toBe(true);
  });

  it("accepts income type", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "income",
      amount: 500,
      category: "Salary",
      description: "Monthly pay",
      confidence: 0.95,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid type", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "transfer",
      amount: 10,
      category: null,
      description: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null amount, category, and description", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: null,
      category: null,
      description: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(true);
  });

  it("rejects negative amount", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: -10,
      category: null,
      description: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero amount", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: 0,
      category: null,
      description: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence below 0", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: 10,
      category: null,
      description: null,
      confidence: -0.1,
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence above 1", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: 10,
      category: null,
      description: null,
      confidence: 1.1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts confidence at boundaries (0 and 1)", () => {
    const atZero = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: null,
      category: null,
      description: null,
      confidence: 0,
    });
    expect(atZero.success).toBe(true);

    const atOne = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: null,
      category: null,
      description: null,
      confidence: 1,
    });
    expect(atOne.success).toBe(true);
  });

  it("rejects missing confidence", () => {
    const result = aiSuggestionSchema.safeParse({
      type: "expense",
      amount: 10,
      category: null,
      description: null,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing type", () => {
    const result = aiSuggestionSchema.safeParse({
      amount: 10,
      category: null,
      description: null,
      confidence: 0.5,
    });
    expect(result.success).toBe(false);
  });
});

describe("aiTransactionDraftSchema", () => {
  it("accepts a complete draft", () => {
    const result = aiTransactionDraftSchema.safeParse({
      type: "expense",
      amount: 24.5,
      category_id: "550e8400-e29b-41d4-a716-446655440000",
      category_name: "Food",
      description: "Lunch",
      date: "2026-03-07",
      confidence: 0.85,
      missing_fields: [],
      needs_confirmation: true,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a partial draft with missing fields", () => {
    const result = aiTransactionDraftSchema.safeParse({
      type: "expense",
      amount: null,
      category_id: null,
      category_name: null,
      description: "Coffee",
      date: null,
      confidence: 0.41,
      missing_fields: ["amount", "category_id", "date"],
      needs_confirmation: true,
    });

    expect(result.success).toBe(true);
  });

  it("coerces flexible model output for type, amount, and category id", () => {
    const result = aiTransactionDraftSchema.safeParse({
      type: "Expense",
      amount: "50.00 USD",
      category_id: "dining-out",
      category_name: "Dining Out",
      description: "Latte",
      date: "2026-03-06",
      confidence: 0.9,
      needs_confirmation: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("expense");
      expect(result.data.amount).toBe(50);
      expect(result.data.category_id).toBe("dining-out");
      expect(result.data.missing_fields).toEqual([]);
    }
  });

  it("normalizes empty optional fields to null", () => {
    const result = aiTransactionDraftSchema.safeParse({
      type: "expense",
      amount: "",
      category_id: "   ",
      category_name: null,
      description: "Coffee",
      date: null,
      confidence: 0.41,
      missing_fields: ["amount", "category_id", "date"],
      needs_confirmation: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBeNull();
      expect(result.data.category_id).toBeNull();
    }
  });
});

describe("aiAssistantResponseSchema", () => {
  it("accepts a response with a draft", () => {
    const result = aiAssistantResponseSchema.safeParse({
      message: "I drafted this transaction for you.",
      draft: {
        type: "income",
        amount: 500,
        category_id: "550e8400-e29b-41d4-a716-446655440000",
        category_name: "Salary",
        description: "March salary",
        date: "2026-03-07",
        confidence: 0.9,
        missing_fields: [],
        needs_confirmation: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a plain assistant response without a draft", () => {
    const result = aiAssistantResponseSchema.safeParse({
      message: "You spent the most on food this month.",
      draft: null,
    });

    expect(result.success).toBe(true);
  });
});

describe("aiChatRequestSchema", () => {
  it("accepts messages with currentDraft", () => {
    const result = aiChatRequestSchema.safeParse({
      messages: [
        {
          role: "assistant",
          content: "Share the amount and date.",
        },
        {
          role: "user",
          content: "It was 15 yesterday",
        },
      ],
      currentDraft: {
        type: "expense",
        amount: null,
        category_id: null,
        category_name: null,
        description: "Coffee",
        date: null,
        confidence: 0.5,
        missing_fields: ["amount", "category_id", "date"],
        needs_confirmation: true,
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts currentDraft category ids that are not UUIDs", () => {
    const result = aiChatRequestSchema.safeParse({
      messages: [
        {
          role: "user",
          content: "Log my lunch",
        },
      ],
      currentDraft: {
        type: "expense",
        amount: 12.5,
        category_id: "dining-out",
        category_name: "Dining Out",
        description: "Lunch",
        date: "2026-03-07",
        confidence: 0.8,
        missing_fields: [],
        needs_confirmation: true,
      },
    });

    expect(result.success).toBe(true);
  });
});
