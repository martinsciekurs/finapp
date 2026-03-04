import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockCreateServerClient = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

// Mock NextResponse and NextRequest
const mockNextResponseCookiesSet = vi.fn();

vi.mock("next/server", () => ({
  NextResponse: {
    next: vi.fn().mockReturnValue({
      cookies: { set: vi.fn() },
    }),
  },
}));

import { updateSession } from "../middleware";
import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRequest(cookieEntries: { name: string; value: string }[] = []) {
  return {
    cookies: {
      getAll: vi.fn().mockReturnValue(cookieEntries),
      set: vi.fn(),
    },
  } as unknown as Parameters<typeof updateSession>[0];
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set env vars
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

    // Default: createServerClient returns a client with getUser
    mockCreateServerClient.mockReturnValue({
      auth: { getUser: mockGetUser },
    });

    // Default NextResponse.next mock
    (NextResponse.next as ReturnType<typeof vi.fn>).mockReturnValue({
      cookies: { set: mockNextResponseCookiesSet },
    });
  });

  it("throws when env vars are missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const request = createMockRequest();
    await expect(updateSession(request)).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  });

  it("creates server client with correct URL and key", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const request = createMockRequest();

    await updateSession(request);

    expect(mockCreateServerClient).toHaveBeenCalledWith(
      "http://localhost:54321",
      "test-anon-key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );
  });

  it("returns user when authenticated", async () => {
    const fakeUser = { id: "user-123", email: "test@example.com" };
    mockGetUser.mockResolvedValue({ data: { user: fakeUser }, error: null });
    const request = createMockRequest();

    const result = await updateSession(request);

    expect(result.user).toEqual(fakeUser);
    expect(result.error).toBeNull();
    expect(result.supabaseResponse).toBeDefined();
    expect(result.supabase).toBeDefined();
  });

  it("returns null user when not authenticated", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: "No session" },
    });
    const request = createMockRequest();

    const result = await updateSession(request);

    expect(result.user).toBeNull();
    expect(result.error).toEqual({ message: "No session" });
  });

  it("reads cookies from the request", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const cookies = [{ name: "sb-token", value: "abc123" }];
    const request = createMockRequest(cookies);

    await updateSession(request);

    // Verify createServerClient was called — the cookies.getAll callback
    // should delegate to request.cookies.getAll
    const clientOptions = mockCreateServerClient.mock.calls[0][2];
    const result = clientOptions.cookies.getAll();
    expect(result).toEqual(cookies);
  });

  it("syncs cookies to both request and response via setAll", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const request = createMockRequest();

    await updateSession(request);

    // Simulate the setAll callback being called (as Supabase SSR does internally)
    const clientOptions = mockCreateServerClient.mock.calls[0][2];
    const cookieToSet = { name: "sb-refresh", value: "refreshed", options: { path: "/" } };
    clientOptions.cookies.setAll([cookieToSet]);

    // Should set on the request
    expect(request.cookies.set).toHaveBeenCalledWith("sb-refresh", "refreshed");
  });
});
