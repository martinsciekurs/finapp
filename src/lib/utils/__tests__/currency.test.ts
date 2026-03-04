import { describe, it, expect } from "vitest";
import { formatCurrency, formatCurrencyCompact } from "../currency";

describe("formatCurrency", () => {
  it("formats USD amounts with two decimal places", () => {
    expect(formatCurrency(1234.56, "USD")).toBe("$1,234.56");
  });

  it("formats zero", () => {
    expect(formatCurrency(0, "USD")).toBe("$0.00");
  });

  it("formats whole numbers with .00", () => {
    expect(formatCurrency(500, "USD")).toBe("$500.00");
  });

  it("formats EUR amounts", () => {
    const result = formatCurrency(2999, "EUR");
    const expected = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(2999);
    expect(result).toBe(expected);
  });

  it("formats GBP amounts", () => {
    const result = formatCurrency(100, "GBP");
    expect(result).toContain("£");
  });

  it("defaults to USD when no currency provided", () => {
    expect(formatCurrency(42)).toBe("$42.00");
  });

  it("falls back to USD for invalid currency code", () => {
    // Invalid currency code should not throw
    const result = formatCurrency(100, "INVALID");
    expect(result).toBe("$100.00");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1000000, "USD")).toBe("$1,000,000.00");
  });

  it("formats small decimal amounts", () => {
    expect(formatCurrency(0.5, "USD")).toBe("$0.50");
  });
});

describe("formatCurrencyCompact", () => {
  it("formats whole numbers without decimals", () => {
    expect(formatCurrencyCompact(1000, "USD")).toBe("$1,000");
  });

  it("formats fractional numbers with two decimals", () => {
    expect(formatCurrencyCompact(1234.5, "USD")).toBe("$1,234.50");
  });

  it("formats zero without decimals", () => {
    expect(formatCurrencyCompact(0, "USD")).toBe("$0");
  });

  it("defaults to USD", () => {
    expect(formatCurrencyCompact(500)).toBe("$500");
  });

  it("falls back to USD for invalid currency", () => {
    expect(formatCurrencyCompact(100, "NOPE")).toBe("$100");
  });
});
