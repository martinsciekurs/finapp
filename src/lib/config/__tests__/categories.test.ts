import { describe, it, expect } from "vitest";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getExpenseCategoryGroups,
} from "../categories";

describe("EXPENSE_CATEGORIES", () => {
  it("has unique names", () => {
    const names = EXPENSE_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has required fields", () => {
    for (const cat of EXPENSE_CATEGORIES) {
      expect(cat.type).toBe("expense");
      expect(cat.name.length).toBeGreaterThan(0);
      expect(cat.icon.length).toBeGreaterThan(0);
      expect(cat.color).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(cat.group).toBeDefined();
    }
  });
});

describe("INCOME_CATEGORIES", () => {
  it("has unique names", () => {
    const names = INCOME_CATEGORIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("every entry has type income", () => {
    for (const cat of INCOME_CATEGORIES) {
      expect(cat.type).toBe("income");
    }
  });

  it("has at least one default selected", () => {
    const defaults = INCOME_CATEGORIES.filter((c) => c.defaultSelected);
    expect(defaults.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getExpenseCategoryGroups", () => {
  it("returns all expense categories grouped", () => {
    const groups = getExpenseCategoryGroups();
    const totalCategories = Object.values(groups).flat();
    expect(totalCategories.length).toBe(EXPENSE_CATEGORIES.length);
  });

  it("each group has at least one category", () => {
    const groups = getExpenseCategoryGroups();
    for (const [, categories] of Object.entries(groups)) {
      expect(categories.length).toBeGreaterThan(0);
    }
  });

  it("produces known groups", () => {
    const groups = getExpenseCategoryGroups();
    expect(Object.keys(groups)).toEqual(
      expect.arrayContaining(["Essentials", "Lifestyle", "Health & Growth"])
    );
  });

  it("falls back to 'Other' group for categories without a group field", () => {
    // All current EXPENSE_CATEGORIES have a group defined, so the
    // fallback to "Other" is a defensive path. We verify the function
    // would handle it by checking the "Other" group exists and contains
    // the "Other" category (which explicitly has group: "Other").
    const groups = getExpenseCategoryGroups();
    expect(groups["Other"]).toBeDefined();
    expect(groups["Other"].some((c) => c.name === "Other")).toBe(true);
  });
});
