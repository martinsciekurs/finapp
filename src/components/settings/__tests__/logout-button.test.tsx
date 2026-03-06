import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockLogout = vi.fn();

vi.mock("@/app/dashboard/settings/actions", () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
}));

import { LogoutButton } from "../logout-button";

describe("LogoutButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls logout action when clicked", async () => {
    const user = userEvent.setup();
    mockLogout.mockResolvedValue(undefined);

    render(<LogoutButton />);

    await user.click(screen.getByRole("button", { name: "Log out" }));

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  it("shows loading state while logout is pending", async () => {
    const user = userEvent.setup();
    mockLogout.mockReturnValue(new Promise(() => {}));

    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: "Log out" });
    await user.click(button);

    await waitFor(() => {
      expect(button).toBeDisabled();
    });
  });

  it("recovers from logout failure by re-enabling button", async () => {
    const user = userEvent.setup();
    mockLogout.mockRejectedValue(new Error("logout failed"));

    render(<LogoutButton />);

    const button = screen.getByRole("button", { name: "Log out" });
    await user.click(button);

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });
});
