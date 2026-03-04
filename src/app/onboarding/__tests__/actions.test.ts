import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be defined before importing the module under test
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

// Mock @/lib/supabase/server
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  }),
}));

// Mock next/navigation — redirect throws NEXT_REDIRECT by design
const redirectError = new Error("NEXT_REDIRECT");
vi.mock("next/navigation", () => ({
  redirect: vi.fn().mockImplementation(() => {
    throw redirectError;
  }),
}));

// Mock next/headers (required by server.ts even though we mock createClient)
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

// Import after mocks are set up
import { completeOnboarding, updateOnboardingStep } from "../actions";
import { redirect } from "next/navigation";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { id: "user-uuid-123" };

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

/** Minimal valid onboarding data */
function validOnboardingData() {
  return {
    categories: [
      { name: "Food", icon: "utensils", color: "#ff0000", type: "expense" as const, group: "Essentials", defaultSelected: true },
      { name: "Transport", icon: "car", color: "#00ff00", type: "expense" as const, group: "Essentials", defaultSelected: true },
      { name: "Salary", icon: "dollar", color: "#0000ff", type: "income" as const, defaultSelected: true },
    ],
    banner: { type: "color" as const, value: "#2d4a3e" },
  };
}

/** Mock groups returned after upsert — used for group_id lookup */
const mockCreatedGroups = [
  { id: "grp-essentials", name: "Essentials", type: "expense" },
  { id: "grp-lifestyle", name: "Lifestyle", type: "expense" },
  { id: "grp-health", name: "Health & Growth", type: "expense" },
  { id: "grp-financial", name: "Financial", type: "expense" },
  { id: "grp-other", name: "Other", type: "expense" },
  { id: "grp-income", name: "Income", type: "income" },
];

/** Creates a standard mock for `supabase.from()` that handles category_groups, categories, and profiles. */
function mockFromWithGroups(overrides?: {
  groupsUpsertError?: { message: string } | null;
  groupsSelectError?: { message: string } | null;
  categoriesUpsertError?: { message: string } | null;
  profileUpdateError?: { message: string } | null;
}) {
  const {
    groupsUpsertError = null,
    groupsSelectError = null,
    categoriesUpsertError = null,
    profileUpdateError = null,
  } = overrides ?? {};

  mockFrom.mockImplementation((table: string) => {
    if (table === "category_groups") {
      return {
        upsert: vi.fn().mockResolvedValue({ error: groupsUpsertError }),
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: groupsSelectError ? null : mockCreatedGroups,
            error: groupsSelectError,
          }),
        }),
      };
    }
    if (table === "categories") {
      return { upsert: vi.fn().mockResolvedValue({ error: categoriesUpsertError }) };
    }
    if (table === "profiles") {
      return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: profileUpdateError }) }) };
    }
    return {};
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await completeOnboarding(validOnboardingData());
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("rejects invalid banner value (XSS attempt)", async () => {
    mockAuthenticated();
    const data = validOnboardingData();
    data.banner.value = '<script>alert("xss")</script>';
    const result = await completeOnboarding(data);
    expect(result).toEqual({ success: false, error: "Invalid banner value" });
  });

  it("rejects banner with missing value property", async () => {
    mockAuthenticated();
    const data = { categories: validOnboardingData().categories, banner: { type: "color" } };
    const result = await completeOnboarding(data as Parameters<typeof completeOnboarding>[0]);
    expect(result).toEqual({ success: false, error: "Invalid banner value" });
  });

  it("accepts valid hex color banner", async () => {
    mockAuthenticated();
    mockFromWithGroups();

    const data = validOnboardingData();
    // completeOnboarding calls redirect on success which throws
    await expect(completeOnboarding(data)).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/dashboard");
    expect(mockFrom).toHaveBeenCalledWith("category_groups");
    expect(mockFrom).toHaveBeenCalledWith("categories");
    expect(mockFrom).toHaveBeenCalledWith("profiles");
  });

  it("accepts valid gradient banner", async () => {
    mockAuthenticated();
    mockFromWithGroups();

    const data = {
      ...validOnboardingData(),
      banner: {
        type: "gradient" as const,
        value: "linear-gradient(135deg, #f5c6a0, #c9a84c)",
      },
    };

    await expect(completeOnboarding(data)).rejects.toThrow("NEXT_REDIRECT");
  });

  it("rejects fewer than 2 expense categories", async () => {
    mockAuthenticated();
    const data = validOnboardingData();
    data.categories = [
      { name: "Food", icon: "utensils", color: "#ff0000", type: "expense" as const, group: "Essentials", defaultSelected: true },
      { name: "Salary", icon: "dollar", color: "#0000ff", type: "income" as const, defaultSelected: true },
    ];
    const result = await completeOnboarding(data);
    expect(result).toEqual({
      success: false,
      error: "At least 2 expense categories required",
    });
  });

  it("rejects non-array categories", async () => {
    mockAuthenticated();
    const data = {
      categories: "not-an-array",
      banner: { type: "color", value: "#2d4a3e" },
    };
    const result = await completeOnboarding(
      data as unknown as Parameters<typeof completeOnboarding>[0]
    );
    expect(result).toEqual({ success: false, error: "Invalid categories data" });
  });

  it("rejects category with invalid type", async () => {
    mockAuthenticated();
    const data = validOnboardingData();
    (data.categories[0] as Record<string, unknown>).type = "transfer";
    const result = await completeOnboarding(data);
    expect(result).toEqual({ success: false, error: "Invalid category data" });
  });

  it("rejects null data", async () => {
    mockAuthenticated();
    const result = await completeOnboarding(
      null as unknown as Parameters<typeof completeOnboarding>[0]
    );
    expect(result).toEqual({ success: false, error: "Invalid onboarding data" });
  });

  it("sanitizes long category names to 100 chars", async () => {
    mockAuthenticated();
    const upsertSpy = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") {
        return {
          upsert: vi.fn().mockResolvedValue({ error: null }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockCreatedGroups,
              error: null,
            }),
          }),
        };
      }
      if (table === "categories") {
        return { upsert: upsertSpy };
      }
      if (table === "profiles") {
        return { update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) };
      }
      return {};
    });

    const data = validOnboardingData();
    data.categories[0].name = "A".repeat(200);

    await expect(completeOnboarding(data)).rejects.toThrow("NEXT_REDIRECT");

    // The first call to mockFrom("categories") should be for categories upsert
    const insertedCategories = upsertSpy.mock.calls[0][0];
    expect(insertedCategories[0].name).toHaveLength(100);
  });

  it("returns error when category upsert fails", async () => {
    mockAuthenticated();
    mockFromWithGroups({ categoriesUpsertError: { message: "DB error" } });

    const result = await completeOnboarding(validOnboardingData());
    expect(result).toEqual({ success: false, error: "Failed to create categories" });
  });

  it("returns error when profile update fails", async () => {
    mockAuthenticated();
    mockFromWithGroups({ profileUpdateError: { message: "DB error" } });

    const result = await completeOnboarding(validOnboardingData());
    expect(result).toEqual({ success: false, error: "Failed to update profile" });
  });

  it("returns error when category groups upsert fails", async () => {
    mockAuthenticated();
    mockFromWithGroups({ groupsUpsertError: { message: "DB error" } });

    const result = await completeOnboarding(validOnboardingData());
    expect(result).toEqual({ success: false, error: "Failed to create category groups" });
  });

  it("returns error when fetching category groups fails", async () => {
    mockAuthenticated();
    mockFromWithGroups({ groupsSelectError: { message: "DB error" } });

    const result = await completeOnboarding(validOnboardingData());
    expect(result).toEqual({ success: false, error: "Failed to fetch category groups" });
  });
});

describe("updateOnboardingStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error for invalid step name", async () => {
    const result = await updateOnboardingStep(
      "hack" as Parameters<typeof updateOnboardingStep>[0]
    );
    expect(result).toEqual({ success: false, error: "Invalid step" });
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateOnboardingStep("welcome");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("calls rpc with correct params for valid step", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: null });

    const result = await updateOnboardingStep("categories");
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("append_onboarding_step", {
      profile_id: fakeUser.id,
      step: "categories",
    });
  });

  it("returns error when rpc fails", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ error: { message: "RPC error" } });

    const result = await updateOnboardingStep("banner");
    expect(result).toEqual({ success: false, error: "Failed to update step" });
  });

  it.each(["welcome", "categories", "banner"] as const)(
    "accepts valid step name: %s",
    async (step) => {
      mockAuthenticated();
      mockRpc.mockResolvedValue({ error: null });
      const result = await updateOnboardingStep(step);
      expect(result).toEqual({ success: true });
    }
  );
});
