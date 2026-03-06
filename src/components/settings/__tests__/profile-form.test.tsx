import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockUpdateProfile = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock("@/app/dashboard/settings/actions", () => ({
  updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));

vi.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

import { ProfileForm } from "../profile-form";

describe("ProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("submits valid values and shows success toast", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({ success: true });

    render(
      <ProfileForm
        defaultValues={{
          displayName: "Jane",
          currency: "USD",
        }}
      />
    );

    const nameInput = screen.getByLabelText("Display Name");
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Updated");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        displayName: "Jane Updated",
        currency: "USD",
      });
      expect(mockToastSuccess).toHaveBeenCalledWith("Profile updated");
    });
  });

  it("shows returned error when action fails", async () => {
    const user = userEvent.setup();
    mockUpdateProfile.mockResolvedValue({
      success: false,
      error: "Failed to update profile",
    });

    render(
      <ProfileForm
        defaultValues={{
          displayName: "Jane",
          currency: "USD",
        }}
      />
    );

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Failed to update profile");
    });
  });
});
