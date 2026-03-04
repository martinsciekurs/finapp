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

/** The visual span is aria-hidden and receives per-frame animation updates. */
function getVisualSpan(container: HTMLElement): HTMLSpanElement {
  const span = container.querySelector<HTMLSpanElement>(
    "span[aria-hidden='true']"
  );
  if (!span) throw new Error("Visual span not found");
  return span;
}

/** The live region span is sr-only and receives the final value via React render. */
function getLiveSpan(container: HTMLElement): HTMLSpanElement {
  const span = container.querySelector<HTMLSpanElement>("span[aria-live]");
  if (!span) throw new Error("Live region span not found");
  return span;
}

describe("AnimatedCounter", () => {
  it("renders visual span with initial animated value", () => {
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={100} formatValue={formatter} />
    );

    const visual = getVisualSpan(container);
    expect(visual).toBeInTheDocument();
    // Visual span starts at 0 (animation hasn't run yet in mock)
    expect(visual.textContent).toBe("$0.00");
  });

  it("applies custom className to the visual span", () => {
    const formatter = (n: number) => `${n}`;
    const { container } = render(
      <AnimatedCounter
        value={50}
        formatValue={formatter}
        className="text-xl font-bold"
      />
    );

    const visual = getVisualSpan(container);
    expect(visual).toHaveClass("text-xl", "font-bold");
  });

  it("renders a separate live region for screen readers", () => {
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={100} formatValue={formatter} />
    );

    const live = getLiveSpan(container);
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveClass("sr-only");
    // Live region always shows the final formatted value
    expect(live.textContent).toBe("$100.00");
  });

  it("shows final value immediately when reduced motion is preferred", () => {
    mockReducedMotion = true;
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={250} formatValue={formatter} />
    );

    // With reduced motion, the visual span shows the final value directly
    const visual = getVisualSpan(container);
    expect(visual.textContent).toBe("$250.00");
  });

  it("starts visual span from 0 when animation is enabled", () => {
    const formatter = (n: number) => `$${n.toFixed(2)}`;
    const { container } = render(
      <AnimatedCounter value={500} formatValue={formatter} />
    );

    // Without reduced motion, visual starts at formatted 0
    const visual = getVisualSpan(container);
    expect(visual.textContent).toBe("$0.00");
    // But the live region has the correct final value for screen readers
    const live = getLiveSpan(container);
    expect(live.textContent).toBe("$500.00");
  });
});
