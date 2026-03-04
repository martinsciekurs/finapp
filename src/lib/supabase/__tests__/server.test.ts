import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreateServerClient = vi.fn().mockReturnValue({ fake: "client" });

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => mockCreateServerClient(...args),
}));

const mockGetAll = vi.fn().mockReturnValue([]);
const mockSet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => mockGetAll(),
    set: (...args: unknown[]) => mockSet(...args),
  }),
}));

import { createClient } from "../server";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createClient (server)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://localhost:54321";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    await expect(createClient()).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  });

  it("throws when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(createClient()).rejects.toThrow(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars"
    );
  });

  it("creates server client with correct URL and key", async () => {
    await createClient();

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

  it("delegates getAll to cookieStore", async () => {
    const fakeCookies = [{ name: "sb-token", value: "abc" }];
    mockGetAll.mockReturnValue(fakeCookies);

    await createClient();

    const options = mockCreateServerClient.mock.calls[0][2];
    const result = options.cookies.getAll();
    expect(result).toEqual(fakeCookies);
  });

  it("delegates setAll to cookieStore (silently catches errors)", async () => {
    await createClient();

    const options = mockCreateServerClient.mock.calls[0][2];
    // Should not throw even if cookieStore.set throws (Server Component context)
    mockSet.mockImplementation(() => {
      throw new Error("Read-only cookies");
    });

    expect(() =>
      options.cookies.setAll([{ name: "sb-token", value: "new", options: {} }])
    ).not.toThrow();
  });
});
