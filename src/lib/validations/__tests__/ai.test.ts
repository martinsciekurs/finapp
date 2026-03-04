import { describe, it, expect } from "vitest";
import { aiInputSchema, aiSuggestionSchema } from "../ai";

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
