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
  upsertCategoryBudget,
  removeCategoryBudget,
  bulkUpsertCategoryBudgets,
  upsertIncomeTarget,
  removeIncomeTarget,
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
 */
function chainable(terminalResult: unknown) {
  const chain: Record<string, unknown> = {};

  for (const method of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "in", "gte", "lte", "order", "limit",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  // Make chain thenable
  chain.then = vi.fn().mockImplementation(
    (resolve: (v: unknown) => void) => Promise.resolve(terminalResult).then(resolve)
  );

  return { chain };
}

// ---------------------------------------------------------------------------
// upsertCategoryBudget
// ---------------------------------------------------------------------------

describe("upsertCategoryBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    categoryId: validUuid,
    yearMonth: "2026-03",
    amount: 500,
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await upsertCategoryBudget(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (bad UUID)", async () => {
    mockAuthenticated();
    const result = await upsertCategoryBudget({
      ...validData,
      categoryId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error for invalid yearMonth", async () => {
    mockAuthenticated();
    const result = await upsertCategoryBudget({
      ...validData,
      yearMonth: "2026-13",
    });
    expect(result.success).toBe(false);
  });

  it("returns error for negative amount", async () => {
    mockAuthenticated();
    const result = await upsertCategoryBudget({
      ...validData,
      amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it("returns error when category not found", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      return {};
    });

    const result = await upsertCategoryBudget(validData);
    expect(result).toEqual({ success: false, error: "Category not found" });
  });

  it("returns success on valid upsert", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: budgetChain } = chainable(undefined);
    budgetChain.single = vi.fn().mockResolvedValue({
      data: { id: "budget-id-1" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "category_budgets") return budgetChain;
      return {};
    });

    const result = await upsertCategoryBudget(validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "budget-id-1" });
  });

  it("returns error on upsert failure", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: budgetChain } = chainable(undefined);
    budgetChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "category_budgets") return budgetChain;
      return {};
    });

    const result = await upsertCategoryBudget(validData);
    expect(result).toEqual({ success: false, error: "Failed to save budget" });
  });
});

// ---------------------------------------------------------------------------
// removeCategoryBudget
// ---------------------------------------------------------------------------

describe("removeCategoryBudget", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = { categoryId: validUuid, yearMonth: "2026-03" };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await removeCategoryBudget(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid UUID", async () => {
    mockAuthenticated();
    const result = await removeCategoryBudget({
      categoryId: "bad",
      yearMonth: "2026-03",
    });
    expect(result.success).toBe(false);
  });

  it("returns success when budget is deleted", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: "budget-id" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "category_budgets") return chain;
      return {};
    });

    const result = await removeCategoryBudget(validData);
    expect(result).toEqual({ success: true });
  });

  it("returns error when budget not found", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "category_budgets") return chain;
      return {};
    });

    const result = await removeCategoryBudget(validData);
    expect(result).toEqual({ success: false, error: "Budget not found" });
  });
});

// ---------------------------------------------------------------------------
// bulkUpsertCategoryBudgets
// ---------------------------------------------------------------------------

describe("bulkUpsertCategoryBudgets", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    items: [
      { categoryId: validUuid, yearMonth: "2026-03", amount: 200 },
      { categoryId: validUuid2, yearMonth: "2026-03", amount: 300 },
    ],
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await bulkUpsertCategoryBudgets(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for empty items", async () => {
    mockAuthenticated();
    const result = await bulkUpsertCategoryBudgets({ items: [] });
    expect(result.success).toBe(false);
  });

  it("returns error when category not owned by user", async () => {
    mockAuthenticated();
    // Only one category returned (not both)
    const { chain: catChain } = chainable(undefined);
    catChain.then = vi.fn().mockImplementation(
      (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: [{ id: validUuid }], error: null }).then(resolve)
    );

    const { chain: budgetChain } = chainable({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "category_budgets") return budgetChain;
      return {};
    });

    const result = await bulkUpsertCategoryBudgets(validData);
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("returns success when all categories owned", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable(undefined);
    catChain.then = vi.fn().mockImplementation(
      (resolve: (v: unknown) => void) =>
        Promise.resolve({
          data: [{ id: validUuid }, { id: validUuid2 }],
          error: null,
        }).then(resolve)
    );

    const { chain: budgetChain } = chainable(undefined);
    budgetChain.then = vi.fn().mockImplementation(
      (resolve: (v: unknown) => void) =>
        Promise.resolve({ data: null, error: null }).then(resolve)
    );

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "category_budgets") return budgetChain;
      return {};
    });

    const result = await bulkUpsertCategoryBudgets(validData);
    expect(result).toEqual({ success: true });
  });
});

// ---------------------------------------------------------------------------
// upsertIncomeTarget
// ---------------------------------------------------------------------------

describe("upsertIncomeTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = { yearMonth: "2026-03", amount: 5000 };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await upsertIncomeTarget(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid yearMonth", async () => {
    mockAuthenticated();
    const result = await upsertIncomeTarget({
      yearMonth: "bad",
      amount: 5000,
    });
    expect(result.success).toBe(false);
  });

  it("returns error for zero amount", async () => {
    mockAuthenticated();
    const result = await upsertIncomeTarget({
      yearMonth: "2026-03",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  it("returns success on valid upsert", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.single = vi.fn().mockResolvedValue({
      data: { id: "income-id-1" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monthly_income_targets") return chain;
      return {};
    });

    const result = await upsertIncomeTarget(validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "income-id-1" });
  });

  it("returns error on upsert failure", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monthly_income_targets") return chain;
      return {};
    });

    const result = await upsertIncomeTarget(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to save income target",
    });
  });
});

// ---------------------------------------------------------------------------
// removeIncomeTarget
// ---------------------------------------------------------------------------

describe("removeIncomeTarget", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await removeIncomeTarget({ yearMonth: "2026-03" });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid yearMonth", async () => {
    mockAuthenticated();
    const result = await removeIncomeTarget({ yearMonth: "bad" });
    expect(result.success).toBe(false);
  });

  it("returns success when target is deleted", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: "income-id" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monthly_income_targets") return chain;
      return {};
    });

    const result = await removeIncomeTarget({ yearMonth: "2026-03" });
    expect(result).toEqual({ success: true });
  });

  it("returns error when income target not found", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "monthly_income_targets") return chain;
      return {};
    });

    const result = await removeIncomeTarget({ yearMonth: "2026-03" });
    expect(result).toEqual({
      success: false,
      error: "Income target not found",
    });
  });
});
