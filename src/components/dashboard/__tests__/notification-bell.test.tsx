import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationBell } from "../notification-bell";

describe("NotificationBell", () => {
  it("renders a button with accessible label", () => {
    render(<NotificationBell />);
    expect(
      screen.getByRole("button", { name: "Notifications" })
    ).toBeInTheDocument();
  });

  it("renders as ghost variant button", () => {
    render(<NotificationBell />);
    const button = screen.getByRole("button", { name: "Notifications" });
    expect(button).toHaveAttribute("data-variant", "ghost");
  });
});
