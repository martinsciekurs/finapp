import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: () => ({
      select: (...args: unknown[]) => {
        mockSelect(...args);
        return {
          eq: (...eqArgs: unknown[]) => {
            mockEq(...eqArgs);
            return {
              single: (...singleArgs: unknown[]) => mockSingle(...singleArgs),
            };
          },
        };
      },
    }),
  }),
}));

import { fetchTourState } from "../tour";

describe("fetchTourState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty tour state when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await fetchTourState();

    expect(result).toEqual({
      tourCompletedAt: null,
      tourCompletedSteps: [],
    });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("returns profile tour state when profile row exists", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: {
        tour_completed_at: "2026-03-06T11:00:00.000Z",
        tour_completed_steps: ["welcome-tour", "tip-budget"],
      },
      error: null,
    });

    const result = await fetchTourState();

    expect(result).toEqual({
      tourCompletedAt: "2026-03-06T11:00:00.000Z",
      tourCompletedSteps: ["welcome-tour", "tip-budget"],
    });
    expect(mockSelect).toHaveBeenCalledWith("tour_completed_at, tour_completed_steps");
    expect(mockEq).toHaveBeenCalledWith(
      "id",
      "550e8400-e29b-41d4-a716-446655440000"
    );
  });

  it("returns empty defaults when profile row is missing", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockSingle.mockResolvedValue({ data: null, error: null });

    const result = await fetchTourState();

    expect(result).toEqual({
      tourCompletedAt: null,
      tourCompletedSteps: [],
    });
  });

  it("throws when auth request fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "auth failed" },
    });

    await expect(fetchTourState()).rejects.toThrow("Failed to authenticate user: auth failed");
  });

  it("throws when profile query fails", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "query failed" },
    });

    await expect(fetchTourState()).rejects.toThrow("Failed to fetch tour state: query failed");
  });

  it("returns empty steps when tour_completed_steps contains non-string values", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "550e8400-e29b-41d4-a716-446655440000" } },
      error: null,
    });
    mockSingle.mockResolvedValue({
      data: {
        tour_completed_at: "2026-03-06T11:00:00.000Z",
        tour_completed_steps: ["welcome-tour", 123],
      },
      error: null,
    });

    const result = await fetchTourState();

    expect(result).toEqual({
      tourCompletedAt: "2026-03-06T11:00:00.000Z",
      tourCompletedSteps: [],
    });
  });
});
