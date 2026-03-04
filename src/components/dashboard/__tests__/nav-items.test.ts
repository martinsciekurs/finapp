import { describe, it, expect } from "vitest";
import { NAV_ITEMS, isNavItemActive } from "../nav-items";

describe("NAV_ITEMS", () => {
  it("contains exactly 6 navigation items", () => {
    expect(NAV_ITEMS).toHaveLength(6);
  });

  it("all items have required properties", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.href).toMatch(/^\/dashboard/);
      expect(item.icon).toBeDefined();
    }
  });

  it("has unique hrefs", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("has unique labels", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("includes expected nav destinations", () => {
    const labels = NAV_ITEMS.map((item) => item.label);
    expect(labels).toContain("Overview");
    expect(labels).toContain("Transactions");
    expect(labels).toContain("Budget");
    expect(labels).toContain("Reminders");
    expect(labels).toContain("Debts");
    expect(labels).toContain("Settings");
  });

  it("Overview links to /dashboard root", () => {
    const overview = NAV_ITEMS.find((item) => item.label === "Overview");
    expect(overview?.href).toBe("/dashboard");
  });
});

describe("isNavItemActive", () => {
  it("marks /dashboard active only for exact match", () => {
    expect(isNavItemActive("/dashboard", "/dashboard")).toBe(true);
    expect(isNavItemActive("/dashboard", "/dashboard/transactions")).toBe(false);
    expect(isNavItemActive("/dashboard", "/dashboard/budget")).toBe(false);
  });

  it("marks sub-routes active with prefix matching", () => {
    expect(
      isNavItemActive("/dashboard/transactions", "/dashboard/transactions")
    ).toBe(true);
    expect(
      isNavItemActive("/dashboard/budget", "/dashboard/budget")
    ).toBe(true);
  });

  it("marks nested sub-routes as active", () => {
    expect(
      isNavItemActive(
        "/dashboard/transactions",
        "/dashboard/transactions/abc-123"
      )
    ).toBe(true);
  });

  it("does not match unrelated routes", () => {
    expect(
      isNavItemActive("/dashboard/transactions", "/dashboard/budget")
    ).toBe(false);
    expect(
      isNavItemActive("/dashboard/debts", "/dashboard/settings")
    ).toBe(false);
  });
});
