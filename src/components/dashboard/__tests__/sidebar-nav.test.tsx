import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidebarNav } from "../sidebar-nav";
import { NAV_ITEMS } from "../nav-items";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
}));

vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));

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

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  DrawerTrigger: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="drawer-content">{children}</div>
  ),
  DrawerClose: ({
    children,
  }: {
    children: React.ReactNode;
    asChild?: boolean;
  }) => <>{children}</>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("../settings-drawer-content", () => ({
  SettingsDrawerContent: () => (
    <div data-testid="settings-drawer-content">Settings</div>
  ),
}));

const defaultProps = { displayName: "Test User" };

describe("SidebarNav", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders navigation landmark", () => {
    render(<SidebarNav {...defaultProps} />);
    expect(
      screen.getByRole("navigation", { name: "Main navigation" })
    ).toBeInTheDocument();
  });

  it("renders all nav links with correct hrefs", () => {
    render(<SidebarNav {...defaultProps} />);
    for (const item of NAV_ITEMS) {
      const link = screen.getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }
  });

  it("renders Simplony title", () => {
    render(<SidebarNav {...defaultProps} />);
    expect(screen.getByText("Simplony")).toBeInTheDocument();
  });

  it("marks active item with aria-current", () => {
    mockPathname = "/dashboard/budget";
    render(<SidebarNav {...defaultProps} />);
    const budgetLink = screen.getByRole("link", { name: "Budget" });
    expect(budgetLink).toHaveAttribute("aria-current", "page");
  });

  it("renders settings as a drawer trigger button", () => {
    render(<SidebarNav {...defaultProps} />);
    const settingsBtn = screen.getByRole("button", { name: "Settings" });
    expect(settingsBtn).toBeInTheDocument();
  });

  it("collapse button has aria-expanded", () => {
    render(<SidebarNav {...defaultProps} />);
    const btn = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("hides labels and title when collapsed", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" })
    );

    expect(screen.queryByText("Simplony")).not.toBeInTheDocument();
    const expandBtn = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");
  });

  it("shows tooltips when collapsed", () => {
    render(<SidebarNav {...defaultProps} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Collapse sidebar" })
    );

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips.length).toBe(NAV_ITEMS.length + 1);
  });

  it("does not mark Overview as active on sub-routes", () => {
    mockPathname = "/dashboard/settings";
    render(<SidebarNav {...defaultProps} />);
    const overviewLink = screen.getByRole("link", { name: "Overview" });
    expect(overviewLink).not.toHaveAttribute("aria-current", "page");
  });
});
