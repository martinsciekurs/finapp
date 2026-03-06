import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import { completeTour, dismissQuickTip } from "../tour-actions";

const fakeUser = { id: "550e8400-e29b-41d4-a716-446655440000" };

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
}

describe("completeTour", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();

    const result = await completeTour();

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns error when authentication request fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "auth failed" },
    });

    const result = await completeTour();

    expect(result).toEqual({
      success: false,
      error: "Failed to authenticate user",
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns error when rpc fails", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: { message: "rpc failed" } });

    const result = await completeTour();

    expect(result).toEqual({
      success: false,
      error: "Failed to update tour step",
    });
  });

  it("appends welcome-tour step successfully", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: null });

    const result = await completeTour();

    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("append_tour_step", {
      profile_id: fakeUser.id,
      step: "welcome-tour",
    });
  });
});

describe("dismissQuickTip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid step", async () => {
    mockAuthenticated();

    const result = await dismissQuickTip("invalid-step" as never);

    expect(result).toEqual({ success: false, error: "Invalid tour step" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();

    const result = await dismissQuickTip("tip-budget");

    expect(result).toEqual({ success: false, error: "Not authenticated" });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("returns error when rpc fails", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: { message: "rpc failed" } });

    const result = await dismissQuickTip("tip-debts");

    expect(result).toEqual({ success: false, error: "Failed to dismiss tip" });
  });

  it("appends tip step successfully", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: null });

    const result = await dismissQuickTip("tip-budget");

    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("append_tour_step", {
      profile_id: fakeUser.id,
      step: "tip-budget",
    });
  });
});
