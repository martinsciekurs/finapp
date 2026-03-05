import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
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
  createCategory,
  updateCategory,
  deleteCategory,
  createGroup,
  updateGroup,
  deleteGroup,
  reorderCategories,
  reorderGroups,
  getCategoryTransactionCount,
} from "../actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { id: "user-uuid-123" };
const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validUuid2 = "660e8400-e29b-41d4-a716-446655440000";

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

/**
 * Build a chainable query mock for Supabase.
 * Every method returns `this` except terminal methods (single/maybeSingle)
 * which resolve with `terminalResult`.
 *
 * The chain is also thenable — `await chain` resolves to `terminalResult`.
 * This mimics Supabase's PromiseLike query builder used in count queries.
 */
function chainable(terminalResult: unknown) {
  const chain: Record<string, unknown> = {};

  // Chain methods
  for (const method of [
    "select", "insert", "update", "delete",
    "eq", "order", "limit",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  // Terminal methods
  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  // Make chain thenable (for `await supabase.from().select().eq().eq()`)
  chain.then = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void) => Promise.resolve(terminalResult).then(resolve)
  );

  return { chain };
}

// ---------------------------------------------------------------------------
// createCategory
// ---------------------------------------------------------------------------

describe("createCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    name: "Groceries",
    icon: "shopping-cart" as const,
    color: "#4a8c6f",
    type: "expense" as const,
    group_id: validUuid,
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await createCategory(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (empty name)", async () => {
    mockAuthenticated();
    const result = await createCategory({ ...validData, name: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error when group not found", async () => {
    mockAuthenticated();
    const { chain: groupChain } = chainable({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") return groupChain;
      return {};
    });

    const result = await createCategory(validData);
    expect(result).toEqual({ success: false, error: "Invalid group" });
  });

  it("returns error for category/group type mismatch", async () => {
    mockAuthenticated();
    const { chain: groupChain } = chainable({
      data: { id: validUuid, type: "income" },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") return groupChain;
      return {};
    });

    const result = await createCategory(validData);
    expect(result).toEqual({
      success: false,
      error: "Category type must match group type",
    });
  });

  it("returns success on successful creation", async () => {
    mockAuthenticated();

    const { chain: groupChain } = chainable({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") return groupChain;
      return {};
    });

    // RPC returns the new category ID
    mockRpc.mockResolvedValue({ data: "new-cat-id", error: null });

    const result = await createCategory(validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "new-cat-id" });
    expect(mockRpc).toHaveBeenCalledWith("create_category_auto_sort", {
      p_group_id: validUuid,
      p_name: "Groceries",
      p_type: "expense",
      p_icon: "shopping-cart",
      p_color: "#4a8c6f",
    });
  });

  it("returns duplicate error on unique constraint violation", async () => {
    mockAuthenticated();

    const { chain: groupChain } = chainable({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") return groupChain;
      return {};
    });

    // RPC returns duplicate error
    mockRpc.mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate" },
    });

    const result = await createCategory(validData);
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });
});

// ---------------------------------------------------------------------------
// updateCategory
// ---------------------------------------------------------------------------

describe("updateCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateCategory("cat-id", { name: "Updated" });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for empty id", async () => {
    mockAuthenticated();
    const result = await updateCategory("", { name: "Updated" });
    expect(result).toEqual({ success: false, error: "Invalid category ID" });
  });

  it("returns error for invalid update data", async () => {
    mockAuthenticated();
    const result = await updateCategory("cat-id", { name: "" });
    expect(result.success).toBe(false);
  });

  it("returns success on valid name update", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    // Override select to return data array
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: "cat-id" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return chain;
      return {};
    });

    const result = await updateCategory("cat-id", { name: "Updated" });
    expect(result).toEqual({ success: true });
  });

  it("returns not found when no rows affected", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return chain;
      return {};
    });

    const result = await updateCategory("cat-id", { name: "Updated" });
    expect(result).toEqual({ success: false, error: "Category not found" });
  });

  it("returns error when moving to a group of different type", async () => {
    mockAuthenticated();

    // Current category is expense
    const { chain: catChain } = chainable({
      data: { type: "expense" },
      error: null,
    });
    // Target group is income
    const { chain: groupChain } = chainable({
      data: { id: validUuid2, type: "income" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "category_groups") return groupChain;
      return {};
    });

    const result = await updateCategory("cat-id", { group_id: validUuid2 });
    expect(result).toEqual({
      success: false,
      error: "Cannot move category to a group of different type",
    });
  });
});

// ---------------------------------------------------------------------------
// deleteCategory
// ---------------------------------------------------------------------------

describe("deleteCategory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteCategory({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid id", async () => {
    mockAuthenticated();
    const result = await deleteCategory({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("returns error when transactions exist but no reassign target", async () => {
    mockAuthenticated();
    // .from("transactions").select("id", opts).eq().eq() → { count, error }
    const { chain: countChain } = chainable({ count: 5, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") return countChain;
      return {};
    });

    const result = await deleteCategory({ id: validUuid });
    expect(result.success).toBe(false);
    expect(result.error).toContain("transactions");
  });

  it("returns error for self-reassign", async () => {
    mockAuthenticated();
    const result = await deleteCategory({
      id: validUuid,
      reassign_to: validUuid,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("same category");
  });

  it("returns success when no transactions (direct delete via RPC)", async () => {
    mockAuthenticated();
    const { chain: countChain } = chainable({ count: 0, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") return countChain;
      return {};
    });

    // RPC handles the delete
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await deleteCategory({ id: validUuid });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_category_with_reassign", {
      p_category_id: validUuid,
      p_reassign_to: undefined,
    });
  });

  it("returns success when transactions exist and reassign target is valid", async () => {
    mockAuthenticated();
    const { chain: countChain } = chainable({ count: 3, error: null });
    const { chain: sourceCatChain } = chainable({
      data: { type: "expense" },
      error: null,
    });
    const { chain: targetCatChain } = chainable({
      data: { id: validUuid2, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") return countChain;
      if (table === "categories") {
        // First call: source cat type lookup (.single()), second: target cat (.maybeSingle())
        let catSelectCount = 0;
        return {
          select: vi.fn().mockImplementation(() => {
            catSelectCount++;
            if (catSelectCount === 1) return sourceCatChain;
            return targetCatChain;
          }),
        };
      }
      return {};
    });

    // RPC handles the atomic reassign + delete
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await deleteCategory({
      id: validUuid,
      reassign_to: validUuid2,
    });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_category_with_reassign", {
      p_category_id: validUuid,
      p_reassign_to: validUuid2,
    });
  });
});

// ---------------------------------------------------------------------------
// createGroup
// ---------------------------------------------------------------------------

describe("createGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await createGroup({ name: "Test", type: "expense" });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (empty name)", async () => {
    mockAuthenticated();
    const result = await createGroup({ name: "", type: "expense" });
    expect(result.success).toBe(false);
  });

  it("returns success on successful creation", async () => {
    mockAuthenticated();

    // RPC returns the new group ID
    mockRpc.mockResolvedValue({ data: "new-group-id", error: null });

    const result = await createGroup({ name: "Essentials", type: "expense" });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "new-group-id" });
    expect(mockRpc).toHaveBeenCalledWith("create_group_auto_sort", {
      p_name: "Essentials",
      p_type: "expense",
    });
  });
});

// ---------------------------------------------------------------------------
// updateGroup
// ---------------------------------------------------------------------------

describe("updateGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateGroup("group-id", { name: "Updated" });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for empty id", async () => {
    mockAuthenticated();
    const result = await updateGroup("", { name: "Updated" });
    expect(result).toEqual({ success: false, error: "Invalid group ID" });
  });

  it("returns success on valid update", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: "group-id" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "category_groups") return chain;
      return {};
    });

    const result = await updateGroup("group-id", { name: "Renamed" });
    expect(result).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// deleteGroup
// ---------------------------------------------------------------------------

describe("deleteGroup", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteGroup({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error when group has categories but no reassign target", async () => {
    mockAuthenticated();
    const { chain: countChain } = chainable({ count: 3, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return countChain;
      return {};
    });

    const result = await deleteGroup({ id: validUuid });
    expect(result.success).toBe(false);
    expect(result.error).toContain("categories");
  });

  it("returns error for self-reassign", async () => {
    mockAuthenticated();
    const result = await deleteGroup({
      id: validUuid,
      reassign_to: validUuid,
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("same group");
  });

  it("returns success when group is empty (direct delete via RPC)", async () => {
    mockAuthenticated();
    const { chain: countChain } = chainable({ count: 0, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return countChain;
      return {};
    });

    // RPC handles the delete
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await deleteGroup({ id: validUuid });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_group_with_reassign", {
      p_group_id: validUuid,
      p_reassign_to: undefined,
    });
  });

  it("returns success when categories exist and reassign target is valid", async () => {
    mockAuthenticated();
    const { chain: countChain } = chainable({ count: 2, error: null });
    const { chain: sourceGroupChain } = chainable({
      data: { type: "expense" },
      error: null,
    });
    const { chain: targetGroupChain } = chainable({
      data: { id: validUuid2, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return countChain;
      if (table === "category_groups") {
        let groupSelectCount = 0;
        return {
          select: vi.fn().mockImplementation(() => {
            groupSelectCount++;
            if (groupSelectCount === 1) return sourceGroupChain;
            return targetGroupChain;
          }),
        };
      }
      return {};
    });

    // RPC handles the atomic reassign + delete
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await deleteGroup({
      id: validUuid,
      reassign_to: validUuid2,
    });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_group_with_reassign", {
      p_group_id: validUuid,
      p_reassign_to: validUuid2,
    });
  });
});

// ---------------------------------------------------------------------------
// reorderCategories
// ---------------------------------------------------------------------------

describe("reorderCategories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await reorderCategories({
      items: [{ id: validUuid, sort_order: 0 }],
    });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (empty items)", async () => {
    mockAuthenticated();
    const result = await reorderCategories({ items: [] });
    expect(result.success).toBe(false);
  });

  it("returns success when reorder succeeds via RPC", async () => {
    mockAuthenticated();

    // RPC handles the batch reorder
    mockRpc.mockResolvedValue({ data: null, error: null });

    const items = [
      { id: validUuid, sort_order: 0 },
      { id: validUuid2, sort_order: 1 },
    ];

    const result = await reorderCategories({ items });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("batch_reorder_categories", {
      p_items: items,
    });
  });
});

// ---------------------------------------------------------------------------
// reorderGroups
// ---------------------------------------------------------------------------

describe("reorderGroups", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await reorderGroups({
      items: [{ id: validUuid, sort_order: 0 }],
    });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns success when reorder succeeds via RPC", async () => {
    mockAuthenticated();

    // RPC handles the batch reorder
    mockRpc.mockResolvedValue({ data: null, error: null });

    const items = [{ id: validUuid, sort_order: 0 }];

    const result = await reorderGroups({ items });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("batch_reorder_groups", {
      p_items: items,
    });
  });
});

// ---------------------------------------------------------------------------
// getCategoryTransactionCount
// ---------------------------------------------------------------------------

describe("getCategoryTransactionCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await getCategoryTransactionCount(validUuid);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns count on success", async () => {
    mockAuthenticated();
    const { chain } = chainable({ count: 7, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "transactions") return chain;
      return {};
    });

    const result = await getCategoryTransactionCount(validUuid);
    expect(result).toEqual({ success: true, data: { count: 7 } });
  });
});


