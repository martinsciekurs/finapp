import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getWelcomeTourSteps } from "../tour-steps";

describe("getWelcomeTourSteps", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1200,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });
  });

  it("returns 4 tour steps", () => {
    const steps = getWelcomeTourSteps();
    expect(steps).toHaveLength(4);
  });

  it("first step targets hero-banner", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[0].element).toBe('[data-tour="hero-banner"]');
  });

  it("first step has correct popover content", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[0].popover?.title).toBe("Welcome to your dashboard");
    expect(steps[0].popover?.description).toContain("personal space");
    expect(steps[0].popover?.side).toBe("bottom");
    expect(steps[0].popover?.align).toBe("center");
  });

  it("second step targets summary-cards", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[1].element).toBe('[data-tour="summary-cards"]');
  });

  it("second step has correct popover content", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[1].popover?.title).toBe("Your financial snapshot");
    expect(steps[1].popover?.description).toContain("Income, spending");
    expect(steps[1].popover?.side).toBe("bottom");
    expect(steps[1].popover?.align).toBe("center");
  });

  it("third step targets sidebar-nav on desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].element).toBe('[data-tour="sidebar-nav"]');
  });

  it("third step targets bottom-nav on mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].element).toBe('[data-tour="bottom-nav"]');
  });

  it("third step has correct popover content on desktop", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1200,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].popover?.title).toBe("Navigate your finances");
    expect(steps[2].popover?.description).toContain("Transactions, budgets");
    expect(steps[2].popover?.side).toBe("right");
    expect(steps[2].popover?.align).toBe("center");
  });

  it("third step has correct popover content on mobile", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].popover?.title).toBe("Navigate your finances");
    expect(steps[2].popover?.description).toContain("Transactions, budgets");
    expect(steps[2].popover?.side).toBe("top");
    expect(steps[2].popover?.align).toBe("center");
  });

  it("fourth step targets recent-transactions", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[3].element).toBe('[data-tour="recent-transactions"]');
  });

  it("fourth step has correct popover content", () => {
    const steps = getWelcomeTourSteps();
    expect(steps[3].popover?.title).toBe("Start by adding a transaction");
    expect(steps[3].popover?.description).toContain("Transactions");
    expect(steps[3].popover?.side).toBe("top");
    expect(steps[3].popover?.align).toBe("center");
  });

  it("uses sidebar-nav for viewport width at 1024 boundary", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].element).toBe('[data-tour="sidebar-nav"]');
  });

  it("uses bottom-nav for viewport width below 1024", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 1023,
    });

    const steps = getWelcomeTourSteps();
    expect(steps[2].element).toBe('[data-tour="bottom-nav"]');
  });
});
