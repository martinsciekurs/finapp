import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CategoriesSkeleton } from "../categories-skeleton";

describe("CategoriesSkeleton", () => {
  it("renders without errors", () => {
    const { container } = render(<CategoriesSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders skeleton elements", () => {
    const { container } = render(<CategoriesSkeleton />);
    const skeletons = container.querySelectorAll("[data-slot='skeleton']");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders three group skeletons", () => {
    const { container } = render(<CategoriesSkeleton />);
    // Each group has a rounded-xl border card
    const groupCards = container.querySelectorAll(".rounded-xl.border");
    expect(groupCards.length).toBe(3);
  });
});
