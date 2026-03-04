import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { BottomNav } from "../bottom-nav";
import { NAV_ITEMS } from "../nav-items";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, className, ...rest }: React.ComponentProps<"div">) => (
      <div className={className} data-testid="motion-div" {...rest}>
        {children}
      </div>
    ),
    span: ({ children, className, ...rest }: React.ComponentProps<"span">) => (
      <span className={className} data-testid="motion-span" {...rest}>
        {children}
      </span>
    ),
  },
}));

describe("BottomNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders navigation landmark with mobile label", () => {
    render(<BottomNav />);
    expect(
      screen.getByRole("navigation", { name: "Mobile navigation" })
    ).toBeInTheDocument();
  });

  it("renders all 6 nav links with correct hrefs", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("marks Overview as active on /dashboard", () => {
    render(<BottomNav />);
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).toHaveAttribute("aria-current", "page");
  });

  it("marks Transactions as active on /dashboard/transactions", () => {
    mockPathname = "/dashboard/transactions";
    render(<BottomNav />);
    const txLink = screen.getByRole("link", { name: "Transactions" });
    expect(txLink).toHaveAttribute("aria-current", "page");
  });

  it("shows label only for active item", () => {
    render(<BottomNav />);
    // Active item shows label as visible text
    expect(screen.getByText("Overview")).toBeInTheDocument();
    // Inactive items don't render label text (only aria-label)
    expect(screen.queryByText("Transactions")).not.toBeInTheDocument();
    expect(screen.queryByText("Budget")).not.toBeInTheDocument();
  });

  it("does not mark Overview as active on sub-routes", () => {
    mockPathname = "/dashboard/transactions";
    render(<BottomNav />);
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).not.toHaveAttribute("aria-current", "page");
  });

  it("marks Transactions as active on nested sub-routes", () => {
    mockPathname = "/dashboard/transactions/abc-123";
    render(<BottomNav />);
    const txLink = screen.getByRole("link", { name: "Transactions" });
    expect(txLink).toHaveAttribute("aria-current", "page");
  });

  it("has minimum touch target sizes", () => {
    render(<BottomNav />);
    const links = screen.getAllByRole("link");
    for (const link of links) {
      expect(link.className).toContain("min-h-[44px]");
      expect(link.className).toContain("min-w-[44px]");
    }
  });
});
