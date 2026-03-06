import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarNav } from "../sidebar-nav";
import { NAV_ITEMS } from "../nav-items";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

// Mock tooltip to render children directly
vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TooltipTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div role="tooltip">{children}</div>
  ),
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

describe("SidebarNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders navigation landmark", () => {
    render(<SidebarNav />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
  });

  it("renders all 6 nav links with correct hrefs", () => {
    render(<SidebarNav />);
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("renders Simplony title", () => {
    render(<SidebarNav />);
    expect(screen.getByText("Simplony")).toBeInTheDocument();
  });

  it("marks active item with aria-current", () => {
    mockPathname = "/dashboard/budget";
    render(<SidebarNav />);
    const budgetLink = screen.getByRole("link", { name: "Budget" });
    expect(budgetLink).toHaveAttribute("aria-current", "page");
  });

  it("collapse button has aria-expanded", () => {
    render(<SidebarNav />);
    const btn = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("hides labels and title when collapsed", () => {
    render(<SidebarNav />);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" })
    );

    expect(screen.queryByText("Simplony")).not.toBeInTheDocument();
    const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("shows tooltips when collapsed", () => {
    render(<SidebarNav />);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" })
    );

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.length).toBe(NAV_ITEMS.length);
  });

  it("does not mark Overview as active on sub-routes", () => {
    mockPathname = "/dashboard/settings";
    render(<SidebarNav />);
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).not.toHaveAttribute("aria-current", "page");
  });
});
