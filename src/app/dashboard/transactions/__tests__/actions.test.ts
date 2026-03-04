import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "../actions";

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

function validCreateData() {
  return {
    category_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: 42.5,
    type: "expense" as const,
    description: "Lunch",
    date: "2026-03-04",
    source: "web" as const,
    ai_generated: false,
  };
}

// ---------------------------------------------------------------------------
// createTransaction
// ---------------------------------------------------------------------------

describe("createTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await createTransaction(validCreateData());
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (negative amount)", async () => {
    mockAuthenticated();
    const result = await createTransaction({
      ...validCreateData(),
      amount: -10,
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error for invalid data (missing type)", async () => {
    mockAuthenticated();
    const data = { ...validCreateData() };
    // @ts-expect-error -- testing runtime validation
    delete data.type;
    const result = await createTransaction(data);
    expect(result.success).toBe(false);
  });

  it("returns error when category not found", async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await createTransaction(validCreateData());
    expect(result).toEqual({ success: false, error: "Invalid category" });
  });

  it("returns error for category type mismatch", async () => {
    mockAuthenticated();
    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    type: "income",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await createTransaction(validCreateData());
    expect(result.success).toBe(false);
    expect(result.error).toContain("Category type mismatch");
  });

  it("returns success with id on successful creation", async () => {
    mockAuthenticated();

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: "new-tx-id" },
          error: null,
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    type: "expense",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transactions") {
        return { insert: mockInsert };
      }
      return {};
    });

    const result = await createTransaction(validCreateData());
    expect(result).toEqual({
      success: true,
      data: { id: "new-tx-id" },
    });
  });

  it("returns error when insert fails", async () => {
    mockAuthenticated();

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: {
                    id: "550e8400-e29b-41d4-a716-446655440000",
                    type: "expense",
                  },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "transactions") {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "DB error" },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const result = await createTransaction(validCreateData());
    expect(result).toEqual({
      success: false,
      error: "Failed to create transaction",
    });
  });
});

// ---------------------------------------------------------------------------
// updateTransaction
// ---------------------------------------------------------------------------

describe("updateTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateTransaction("tx-id", { amount: 100 });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid id", async () => {
    mockAuthenticated();
    const result = await updateTransaction("", { amount: 100 });
    expect(result).toEqual({
      success: false,
      error: "Invalid transaction ID",
    });
  });

  it("returns error for invalid update data", async () => {
    mockAuthenticated();
    const result = await updateTransaction("tx-id", { amount: -5 });
    expect(result.success).toBe(false);
  });

  it("accepts empty update (all fields optional)", async () => {
    mockAuthenticated();

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const result = await updateTransaction("tx-id", {});
    expect(result).toEqual({ success: true });
  });

  it("returns success on valid update", async () => {
    mockAuthenticated();

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") {
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const result = await updateTransaction("tx-id", {
      amount: 99.99,
      description: "Updated",
    });
    expect(result).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// deleteTransaction
// ---------------------------------------------------------------------------

describe("deleteTransaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteTransaction("tx-id");
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for empty id", async () => {
    mockAuthenticated();
    const result = await deleteTransaction("");
    expect(result).toEqual({
      success: false,
      error: "Invalid transaction ID",
    });
  });

  it("returns success on successful delete", async () => {
    mockAuthenticated();

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });

    const result = await deleteTransaction("tx-id");
    expect(result).toEqual({ success: true });
  });

  it("returns error when delete fails", async () => {
    mockAuthenticated();

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi
              .fn()
              .mockResolvedValue({ error: { message: "DB error" } }),
          }),
        };
      }
      return {};
    });

    const result = await deleteTransaction("tx-id");
    expect(result).toEqual({
      success: false,
      error: "Failed to delete transaction",
    });
  });
});
