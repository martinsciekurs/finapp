import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroBanner } from "../hero-banner";

// Shared mock — Proxy handles motion.div, motion.h1, motion.button, etc.
vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

describe("HeroBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders morning greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    render(<HeroBanner displayName="Alex" banner={null} />);
    expect(screen.getByText("Good morning, Alex")).toBeInTheDocument();
  });

  it("renders afternoon greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 14, 0, 0));
    render(<HeroBanner displayName="Alex" banner={null} />);
    expect(screen.getByText("Good afternoon, Alex")).toBeInTheDocument();
  });

  it("renders evening greeting", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 20, 0, 0));
    render(<HeroBanner displayName="Alex" banner={null} />);
    expect(screen.getByText("Good evening, Alex")).toBeInTheDocument();
  });

  it("uses default gradient when banner is null", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    const { container } = render(
      <HeroBanner displayName="Alex" banner={null} />
    );
    const bannerEl = container.firstChild as HTMLElement;
    expect(bannerEl.style.background).toContain("linear-gradient");
  });

  it("applies solid color banner", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    const { container } = render(
      <HeroBanner
        displayName="Alex"
        banner={{ type: "color", value: "#2d4a3e" }}
      />
    );
    const bannerEl = container.firstChild as HTMLElement;
    expect(bannerEl.style.backgroundColor).toBe("rgb(45, 74, 62)");
  });

  it("applies gradient banner", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    const { container } = render(
      <HeroBanner
        displayName="Alex"
        banner={{
          type: "gradient",
          value: "linear-gradient(135deg, #f5c6a0, #c9a84c)",
        }}
      />
    );
    const bannerEl = container.firstChild as HTMLElement;
    expect(bannerEl.style.background).toContain("linear-gradient");
  });

  it("renders 'Change cover' button with type=button", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    render(<HeroBanner displayName="Alex" banner={null} />);
    const btn = screen.getByRole("button", { name: "Change cover" });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute("type", "button");
  });

  it("uses light text on dark banner", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    render(
      <HeroBanner
        displayName="Alex"
        banner={{ type: "color", value: "#2d4a3e" }}
      />
    );
    const heading = screen.getByText(/Good morning, Alex/);
    expect(heading.className).toContain("text-white");
  });

  it("uses dark text on light banner", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    render(
      <HeroBanner
        displayName="Alex"
        banner={{ type: "color", value: "#fdf6ee" }}
      />
    );
    const heading = screen.getByText(/Good morning, Alex/);
    expect(heading.className).toContain("text-gray-900");
  });

  it("defaults to light text for gradient banners", () => {
    vi.setSystemTime(new Date(2026, 2, 4, 9, 0, 0));
    render(
      <HeroBanner
        displayName="Alex"
        banner={{
          type: "gradient",
          value: "linear-gradient(135deg, #f5c6a0, #c9a84c)",
        }}
      />
    );
    const heading = screen.getByText(/Good morning, Alex/);
    expect(heading.className).toContain("text-white");
  });
});
