import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import React from "react";

// Track useReducedMotion return value per test
let mockReducedMotion = false;

beforeEach(() => {
  mockReducedMotion = false;
});

vi.mock("framer-motion", () => ({
  useMotionValue: (initial: number) => {
    let value = initial;
    return {
      get: () => value,
      set: (v: number) => {
        value = v;
      },
      on: () => () => {},
    };
  },
  useSpring: (motionValue: { get: () => number }) => ({
    get: () => motionValue.get(),
    on: () => () => {},
  }),
  useInView: () => true,
  useReducedMotion: () => mockReducedMotion,
}));

import { AnimatedCounter } from "../animated-counter";

function getCounterSpan(container: HTMLElement): HTMLSpanElement {
  const span = container.querySelector<HTMLSpanElement>("span[aria-live]");
  if (!span) throw new Error("Counter span not found");
  return span;
}

describe("AnimatedCounter", () => {
  it("renders with formatted initial value", () => {
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={100} formatValue={formatter} />
    );

    const span = getCounterSpan(container);
    expect(span).toBeInTheDocument();
    // Initial render shows $0.00 (animation hasn't run yet in mock)
    expect(span.textContent).toBe("$0.00");
  });

  it("applies custom className", () => {
    const formatter = (n: number) => `${n}`;
    const { container } = render(
      <AnimatedCounter
        value={50}
        formatValue={formatter}
        className="text-xl font-bold"
      />
    );

    const span = getCounterSpan(container);
    expect(span).toHaveClass("text-xl", "font-bold");
  });

  it("has aria-live attribute for accessibility", () => {
    const formatter = (n: number) => `${n}`;
    const { container } = render(
      <AnimatedCounter value={100} formatValue={formatter} />
    );

    const span = getCounterSpan(container);
    expect(span).toHaveAttribute("aria-live", "polite");
  });

  it("shows final value immediately when reduced motion is preferred", () => {
    mockReducedMotion = true;
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={250} formatValue={formatter} />
    );

    // With reduced motion, the span should show the final value directly
    const span = getCounterSpan(container);
    expect(span.textContent).toBe("$250.00");
  });

  it("starts from 0 when animation is enabled", () => {
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={500} formatValue={formatter} />
    );

    // Without reduced motion, initial render shows formatted 0
    const span = getCounterSpan(container);
    expect(span.textContent).toBe("$0.00");
  });
});
