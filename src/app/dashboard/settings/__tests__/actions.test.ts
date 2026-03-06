import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockSignOut = vi.fn();
const mockAuthUpdateUser = vi.fn();
const mockRedirect = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
      updateUser: (...args: unknown[]) => mockAuthUpdateUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
    throw new Error(`NEXT_REDIRECT:${String(args[0])}`);
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { logout, updateProfile, updateEmail } from "../actions";

const fakeUser = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "old@example.com",
};

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

describe("settings actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logout", () => {
    it("signs out and redirects to login", async () => {
      mockSignOut.mockResolvedValue({ error: null });

      await expect(logout()).rejects.toThrow("NEXT_REDIRECT:/auth/login");

      expect(mockSignOut).toHaveBeenCalledTimes(1);
      expect(mockRedirect).toHaveBeenCalledWith("/auth/login");
    });

    it("returns failure and does not redirect when sign out fails", async () => {
      mockSignOut.mockResolvedValue({
        error: { message: "sign out failed" },
      });

      const result = await logout();

      expect(result).toEqual({ success: false, error: "sign out failed" });
      expect(mockRedirect).not.toHaveBeenCalled();
    });
  });

  describe("updateProfile", () => {
    it("returns error when not authenticated", async () => {
      mockUnauthenticated();

      const result = await updateProfile({
        displayName: "Alice",
        currency: "USD",
      });

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("returns validation error for unsupported currency", async () => {
      mockAuthenticated();

      const result = await updateProfile({
        displayName: "Alice",
        currency: "XYZ",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("supported currency");
    });

    it("returns error when profile update fails", async () => {
      mockAuthenticated();

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: { message: "db error" } }),
            }),
          };
        }
        return {};
      });

      const result = await updateProfile({
        displayName: "Alice",
        currency: "USD",
      });

      expect(result).toEqual({ success: false, error: "Failed to update profile" });
    });

    it("returns success and revalidates dashboard layout", async () => {
      mockAuthenticated();

      mockFrom.mockImplementation((table: string) => {
        if (table === "profiles") {
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
        return {};
      });

      const result = await updateProfile({
        displayName: "Alice",
        currency: "USD",
      });

      expect(result).toEqual({ success: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard", "layout");
    });
  });

  describe("updateEmail", () => {
    it("returns error when not authenticated", async () => {
      mockUnauthenticated();

      const result = await updateEmail({ email: "next@example.com" });

      expect(result).toEqual({ success: false, error: "Not authenticated" });
    });

    it("returns validation error for invalid email", async () => {
      mockAuthenticated();

      const result = await updateEmail({ email: "invalid" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("valid email");
    });

    it("returns error when new email matches current", async () => {
      mockAuthenticated();

      const result = await updateEmail({ email: "old@example.com" });

      expect(result).toEqual({
        success: false,
        error: "New email is the same as current",
      });
    });

    it("returns generic error when email update fails", async () => {
      mockAuthenticated();
      mockAuthUpdateUser.mockResolvedValue({
        error: { message: "sensitive detail" },
      });

      const result = await updateEmail({ email: "next@example.com" });

      expect(result).toEqual({ success: false, error: "Failed to update email" });
    });

    it("returns generic error when email update throws", async () => {
      mockAuthenticated();
      mockAuthUpdateUser.mockRejectedValue(new Error("boom"));

      const result = await updateEmail({ email: "next@example.com" });

      expect(result).toEqual({ success: false, error: "Failed to update email" });
    });

    it("returns success and revalidates settings profile page", async () => {
      mockAuthenticated();
      mockAuthUpdateUser.mockResolvedValue({ error: null });

      const result = await updateEmail({ email: "next@example.com" });

      expect(mockAuthUpdateUser).toHaveBeenCalledWith({
        email: "next@example.com",
      });
      expect(result).toEqual({ success: true });
      expect(mockRevalidatePath).toHaveBeenCalledWith("/dashboard/settings/profile");
    });
  });
});
