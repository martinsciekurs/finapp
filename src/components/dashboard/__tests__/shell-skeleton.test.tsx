import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  DashboardShellSkeleton,
  BannerSkeleton,
  ContentSkeleton,
} from "../shell-skeleton";

describe("DashboardShellSkeleton", () => {
  it("renders without errors", () => {
    const { container } = render(<DashboardShellSkeleton />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("contains skeleton elements", () => {
    const { container } = render(<DashboardShellSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("BannerSkeleton", () => {
  it("renders a skeleton with banner dimensions", () => {
    const { container } = render(<BannerSkeleton />);
    const skeleton = container.querySelector('[data-slot="skeleton"]');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton?.className).toContain("rounded-2xl");
  });
});

describe("ContentSkeleton", () => {
  it("renders multiple skeleton placeholders", () => {
    const { container } = render(<ContentSkeleton />);
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    // Title + description + 3 cards = 5
    expect(skeletons.length).toBe(5);
  });
});
