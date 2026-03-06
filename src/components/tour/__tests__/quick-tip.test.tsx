import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("framer-motion", async () => import("@/test/mocks/framer-motion"));
vi.mock("@/app/dashboard/tour-actions", () => ({
  dismissQuickTip: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.ComponentProps<"a"> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

import { QuickTip } from "../quick-tip";
import { dismissQuickTip } from "@/app/dashboard/tour-actions";

describe("QuickTip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and description", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    expect(screen.getByText("Budget Tips")).toBeInTheDocument();
    expect(screen.getByText("Learn how to set effective budgets")).toBeInTheDocument();
  });

  it("renders CTA link when href and ctaLabel are provided", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
        href="/dashboard/budget"
        ctaLabel="View Budget"
      />
    );

    const link = screen.getByRole("link", { name: /View Budget/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/dashboard/budget");
  });

  it("does not render CTA link when href is not provided", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    expect(screen.queryByRole("link", { name: /View Budget/i })).not.toBeInTheDocument();
  });

  it("renders Got it button", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    expect(screen.getByRole("button", { name: "Got it" })).toBeInTheDocument();
  });

  it("renders close button with aria-label", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    expect(screen.getByRole("button", { name: "Dismiss tip" })).toBeInTheDocument();
  });

  it("hides tip when Got it button is clicked", async () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    const gotItButton = screen.getByRole("button", { name: "Got it" });
    fireEvent.click(gotItButton);

    await waitFor(() => {
      expect(screen.queryByText("Budget Tips")).not.toBeInTheDocument();
    });
  });

  it("hides tip when close button is clicked", async () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    const closeButton = screen.getByRole("button", { name: "Dismiss tip" });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Budget Tips")).not.toBeInTheDocument();
    });
  });

  it("calls dismissQuickTip server action when Got it is clicked", async () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    const gotItButton = screen.getByRole("button", { name: "Got it" });
    fireEvent.click(gotItButton);

    await waitFor(() => {
      expect(dismissQuickTip).toHaveBeenCalledWith("tip-budget");
    });
  });

  it("calls dismissQuickTip server action when close button is clicked", async () => {
    render(
      <QuickTip
        tipId="tip-debts"
        title="Debt Tips"
        description="Manage your debts effectively"
      />
    );

    const closeButton = screen.getByRole("button", { name: "Dismiss tip" });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(dismissQuickTip).toHaveBeenCalledWith("tip-debts");
    });
  });

  it("renders with custom className", () => {
    const { container } = render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
        className="custom-class"
      />
    );

    const tipDiv = container.querySelector(".custom-class");
    expect(tipDiv).toBeInTheDocument();
  });

  it("has correct accessibility attributes", () => {
    render(
      <QuickTip
        tipId="tip-budget"
        title="Budget Tips"
        description="Learn how to set effective budgets"
      />
    );

    const tipContainer = screen.getByRole("status");
    expect(tipContainer).toHaveAttribute("aria-live", "polite");
  });
});
