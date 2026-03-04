import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { LayoutDashboard, PieChart } from "lucide-react";
import { EmptyState } from "../empty-state";

describe("EmptyState", () => {
  it("renders title and description", () => {
    render(
      <EmptyState
        icon={LayoutDashboard}
        title="No transactions yet"
        description="Add your first transaction to get started."
      />
    );

    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
    expect(
      screen.getByText("Add your first transaction to get started.")
    ).toBeInTheDocument();
  });

  it("renders the icon", () => {
    render(
      <EmptyState
        icon={LayoutDashboard}
        title="Empty"
        description="Nothing here."
      />
    );

    // Lucide icons render as SVGs
    const svg = document.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders action when provided", () => {
    render(
      <EmptyState
        icon={LayoutDashboard}
        title="No data"
        description="Start by adding something."
        action={<button>Add Item</button>}
      />
    );

    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("does not render action container when no action", () => {
    render(
      <EmptyState
        icon={PieChart}
        title="No budgets"
        description="Set up budgets."
      />
    );

    // Should not have a button
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    // The action wrapper div should not be present — verify by checking
    // there's no extra div after the description
    const descriptionEl = screen.getByText("Set up budgets.");
    expect(descriptionEl.nextElementSibling).toBeNull();
  });

  it("applies custom className", () => {
    const { container } = render(
      <EmptyState
        icon={LayoutDashboard}
        title="Test"
        description="Test desc"
        className="min-h-[400px]"
      />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("min-h-[400px]");
  });

  it("has dashed border styling", () => {
    const { container } = render(
      <EmptyState
        icon={LayoutDashboard}
        title="Test"
        description="Test desc"
      />
    );

    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass("border-dashed");
  });

  it("uses serif font for title", () => {
    render(
      <EmptyState
        icon={LayoutDashboard}
        title="Styled Title"
        description="Desc"
      />
    );

    const heading = screen.getByText("Styled Title");
    expect(heading.tagName).toBe("H3");
    expect(heading).toHaveClass("font-serif");
  });
});
