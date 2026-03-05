import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { BudgetSkeleton } from "../budget-skeleton";

describe("BudgetSkeleton", () => {
  it("renders without crashing", () => {
    const { container } = render(<BudgetSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("renders skeleton elements for loading state", () => {
    const { container } = render(<BudgetSkeleton />);
    // Skeleton component renders divs with animate-pulse or similar
    // We just need to verify the structure renders — multiple skeleton elements
    const skeletons = container.querySelectorAll("[class*='skeleton'], [data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });
});
