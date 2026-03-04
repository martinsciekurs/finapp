import { describe, it, expect } from "vitest";
import { aiInputSchema } from "../ai";

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
