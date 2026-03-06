import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardShell } from "../dashboard-shell";

const tourLauncherMock = vi.fn((props: { showTour: boolean }) => {
  void props;
  return null;
});

vi.mock("../profile-menu", () => ({
  ProfileMenu: ({ displayName }: { displayName: string }) => (
    <button data-testid="profile-menu" aria-label="Open profile menu">
      {displayName}
    </button>
  ),
}));

vi.mock("../hero-banner", () => ({
  HeroBanner: ({
    displayName,
    banner,
  }: {
    displayName: string;
    banner: unknown;
  }) => (
    <div data-testid="hero-banner" data-name={displayName} data-banner={JSON.stringify(banner)}>
      HeroBanner
    </div>
  ),
}));

vi.mock("../sidebar-nav", () => ({
  SidebarNav: ({ displayName }: { displayName: string }) => (
    <nav data-testid="sidebar-nav" aria-label="Main navigation" data-display-name={displayName}>
      SidebarNav
    </nav>
  ),
}));

vi.mock("../bottom-nav", () => ({
  BottomNav: () => (
    <nav data-testid="bottom-nav" aria-label="Mobile navigation">
      BottomNav
    </nav>
  ),
}));

vi.mock("../notification-bell", () => ({
  NotificationBell: () => (
    <button data-testid="notification-bell">NotificationBell</button>
  ),
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../ai-panel-provider", () => ({
  AiPanelProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("../ai-panel-trigger", () => ({
  AiPanelTrigger: () => (
    <button data-testid="ai-panel-trigger">AiPanelTrigger</button>
  ),
}));

vi.mock("../ai-panel", () => ({
  AiPanel: () => <aside data-testid="ai-panel">AiPanel</aside>,
}));

vi.mock("@/components/tour/tour-launcher", () => ({
  TourLauncher: (props: { showTour: boolean }) => tourLauncherMock(props),
}));

describe("DashboardShell", () => {
  beforeEach(() => {
    tourLauncherMock.mockClear();
  });

  it("renders all sub-components", () => {
    render(
      <DashboardShell displayName="Alex" banner={null} showTour={false}>
        <p>Test content</p>
      </DashboardShell>
    );

    expect(screen.getByTestId("hero-banner")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    expect(screen.getByTestId("notification-bell")).toBeInTheDocument();
    expect(screen.getByText("Alex")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav")).toHaveAttribute(
      "data-display-name",
      "Alex"
    );
  });

  it("renders children in main content area", () => {
    render(
      <DashboardShell displayName="Alex" banner={null} showTour={false}>
        <p>Test content</p>
      </DashboardShell>
    );

    expect(screen.getByText("Test content")).toBeInTheDocument();
    // Content should be inside <main>
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByText("Test content"));
  });

  it("passes props to HeroBanner", () => {
    const banner = { type: "color" as const, value: "#2d4a3e" };
    render(
      <DashboardShell displayName="Alex" banner={banner} showTour={false}>
        <p>Test</p>
      </DashboardShell>
    );

    const heroBanner = screen.getByTestId("hero-banner");
    expect(heroBanner).toHaveAttribute("data-name", "Alex");
    expect(heroBanner).toHaveAttribute(
      "data-banner",
      JSON.stringify(banner)
    );
  });

  it("has skip-to-content link", () => {
    render(
      <DashboardShell displayName="Alex" banner={null} showTour={false}>
        <p>Test</p>
      </DashboardShell>
    );

    const skipLink = screen.getByText("Skip to content");
    expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  it("main element has id for skip link target", () => {
    render(
      <DashboardShell displayName="Alex" banner={null} showTour={false}>
        <p>Test</p>
      </DashboardShell>
    );

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
  });

  it("passes showTour=true to TourLauncher when tour should be shown", () => {
    render(
      <DashboardShell displayName="Alex" banner={null} showTour>
        <p>Test</p>
      </DashboardShell>
    );

    expect(tourLauncherMock).toHaveBeenCalledTimes(1);
    expect(tourLauncherMock.mock.calls[0]?.[0]).toMatchObject({
      showTour: true,
    });
  });
});
