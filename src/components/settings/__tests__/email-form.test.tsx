import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateEmail = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/app/dashboard/settings/actions", () => ({
  updateEmail: (...args: unknown[]) => mockUpdateEmail(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { EmailForm } from "../email-form";

describe("EmailForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks invalid email and does not call action", async () => {
    const user = userEvent.setup();

    render(<EmailForm defaultEmail="valid@example.com" />);

    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, "test@invalid");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(emailInput).toHaveAttribute("aria-invalid", "true");
    });
    expect(mockUpdateEmail).not.toHaveBeenCalled();
  });

  it("submits valid email and shows success toast", async () => {
    const user = userEvent.setup();
    mockUpdateEmail.mockResolvedValue({ success: true });

    render(<EmailForm defaultEmail="old@example.com" />);

    const emailInput = screen.getByLabelText("Email");
    await user.clear(emailInput);
    await user.type(emailInput, "next@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdateEmail).toHaveBeenCalledWith({ email: "next@example.com" });
      expect(mockToastSuccess).toHaveBeenCalledWith("Email updated");
    });
  });

  it("shows action error toast when submission fails", async () => {
    const user = userEvent.setup();
    mockUpdateEmail.mockResolvedValue({
      success: false,
      error: "Failed to update email",
    });

    render(<EmailForm defaultEmail="old@example.com" />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to update email");
    });
  });
});
