import { beforeEach, describe, expect, it, vi } from "vitest";

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
  createDebt,
  deleteDebt,
  recordDebtPayment,
  updateDebt,
  updateDebtPayment,
  deleteDebtPayment,
} from "../actions";

const fakeUser = { id: "user-uuid-123" };
const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

function chainable(terminalResult: unknown) {
  const chain = Promise.resolve(terminalResult) as Promise<unknown> &
    Record<string, unknown>;

  for (const method of [
    "select",
    "insert",
    "update",
    "delete",
    "upsert",
    "eq",
    "in",
    "gte",
    "lte",
    "order",
    "limit",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  return { chain };
}

describe("createDebt", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    counterparty: "John",
    type: "i_owe" as const,
    category_id: validUuid,
    debt_date: "2026-03-06",
    original_amount: 100,
    description: "Lunch split",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await createDebt(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for invalid input", async () => {
    mockAuthenticated();
    const result = await createDebt({ ...validData, counterparty: "" });
    expect(result.success).toBe(false);
  });

  it("creates debt successfully", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.single = vi.fn().mockResolvedValue({
      data: { id: "debt-1" },
      error: null,
    });

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return chain;
      if (table === "categories") return categoriesChain;
      return {};
    });

    const result = await createDebt(validData);
    expect(result).toEqual({ success: true, data: { id: "debt-1" } });
  });

  it("returns error when insert fails", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return chain;
      if (table === "categories") return categoriesChain;
      return {};
    });

    const result = await createDebt(validData);
    expect(result).toEqual({ success: false, error: "Failed to create debt" });
  });
});

describe("deleteDebt", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteDebt({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for invalid debt id", async () => {
    mockAuthenticated();
    const result = await deleteDebt({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("returns rpc not found error", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Debt not found" },
    });

    const result = await deleteDebt({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Debt not found" });
  });

  it("deletes debt successfully", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ data: { debt_id: validUuid }, error: null });

    const result = await deleteDebt({ id: validUuid });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_debt_atomic", {
      p_debt_id: validUuid,
      p_delete_linked_transactions: false,
    });
  });

  it("passes delete_linked_transactions choice to rpc", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ data: { debt_id: validUuid }, error: null });

    const result = await deleteDebt({
      id: validUuid,
      delete_linked_transactions: true,
    });

    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_debt_atomic", {
      p_debt_id: validUuid,
      p_delete_linked_transactions: true,
    });
  });
});

describe("recordDebtPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    debt_id: validUuid,
    amount: 50,
    payment_date: "2026-03-06",
    note: "Partial",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await recordDebtPayment(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for bad payload", async () => {
    mockAuthenticated();
    const result = await recordDebtPayment({ ...validData, debt_id: "bad" });
    expect(result.success).toBe(false);
  });

  it("returns rpc debt not found error", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Debt not found" },
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({ success: false, error: "Debt not found" });
    expect(mockRpc).toHaveBeenCalledWith("record_debt_payment_atomic", {
      p_debt_id: validUuid,
      p_amount: 50,
      p_note: "Partial",
      p_payment_date: "2026-03-06",
    });
  });

  it("surfaces rpc overpayment error", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Payment exceeds remaining amount" },
    });

    const result = await recordDebtPayment({ ...validData, amount: 100 });
    expect(result).toEqual({
      success: false,
      error: "Payment exceeds remaining amount",
    });
  });

  it("surfaces missing category error", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: null,
      error: {
        message: "Debt has no category. Edit debt and choose a category first.",
      },
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Debt has no category. Edit debt and choose a category first.",
    });
  });

  it("returns generic error when rpc payload is malformed", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({ data: { nope: true }, error: null });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to record debt payment",
    });
  });

  it("records debt payment with linked transaction via rpc", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: { payment_id: "payment-1", transaction_id: "tx-1" },
      error: null,
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({ success: true, data: { id: "payment-1" } });
    expect(mockRpc).toHaveBeenCalledWith("record_debt_payment_atomic", {
      p_debt_id: validUuid,
      p_amount: 50,
      p_note: "Partial",
      p_payment_date: "2026-03-06",
    });
  });
});

describe("updateDebt", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    id: validUuid,
    counterparty: "John",
    type: "i_owe" as const,
    category_id: validUuid,
    debt_date: "2026-03-06",
    original_amount: 100,
    description: "Updated",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateDebt(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for invalid input", async () => {
    mockAuthenticated();
    const result = await updateDebt({ ...validData, counterparty: "" });
    expect(result.success).toBe(false);
  });

  it("prevents changing debt direction when payments exist", async () => {
    mockAuthenticated();

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "income" },
      error: null,
    });

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        original_amount: 100,
        remaining_amount: 100,
        type: "i_owe",
        category_id: validUuid,
      },
      error: null,
    });

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Cannot change debt direction after payments have been logged" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtsChain;
      return {};
    });

    const result = await updateDebt({ ...validData, type: "they_owe" });
    expect(result).toEqual({
      success: false,
      error: "Cannot change debt direction after payments have been logged",
    });
  });

  it("rejects original amount below already paid amount", async () => {
    mockAuthenticated();

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        original_amount: 100,
        remaining_amount: 20,
        type: "i_owe",
        category_id: validUuid,
      },
      error: null,
    });

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Original amount cannot be below already paid amount" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtsChain;
      return {};
    });

    const result = await updateDebt({ ...validData, original_amount: 50 });
    expect(result).toEqual({
      success: false,
      error: "Original amount cannot be below already paid amount",
    });
  });

  it("validates existing category when type changes without new category_id", async () => {
    mockAuthenticated();

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: debtSelectChain } = chainable(undefined);
    debtSelectChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        original_amount: 100,
        remaining_amount: 100,
        type: "i_owe",
        category_id: validUuid,
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtSelectChain;
      return {};
    });

    const result = await updateDebt({
      ...validData,
      type: "they_owe",
      category_id: "",
    });
    expect(result).toEqual({
      success: false,
      error: "Debt type they_owe requires a income category",
    });
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("passes null category_id to rpc so existing category is preserved", async () => {
    mockAuthenticated();

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: debtSelectChain } = chainable(undefined);
    debtSelectChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        original_amount: 100,
        remaining_amount: 100,
        type: "i_owe",
        category_id: validUuid,
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtSelectChain;
      return {};
    });
    mockRpc.mockResolvedValue({ data: null, error: null });

    const result = await updateDebt({ ...validData, category_id: "" });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("update_debt_atomic", {
      p_debt_id: validUuid,
      p_counterparty: "John",
      p_type: "i_owe",
      p_category_id: undefined,
      p_debt_date: "2026-03-06",
      p_original_amount: 100,
      p_description: "Updated",
    });
  });
});

describe("updateDebtPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    id: validUuid,
    amount: 45,
    payment_date: "2026-03-06",
    note: "Updated payment",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateDebtPayment(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for invalid payment id", async () => {
    mockAuthenticated();
    const result = await updateDebtPayment({ ...validData, id: "bad" });
    expect(result.success).toBe(false);
  });

  it("updates payment atomically via rpc", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: { payment_id: validUuid, transaction_id: "tx-1" },
      error: null,
    });

    const result = await updateDebtPayment(validData);
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("update_debt_payment_atomic", {
      p_payment_id: validUuid,
      p_amount: 45,
      p_note: "Updated payment",
      p_payment_date: "2026-03-06",
    });
  });

  it("surfaces rpc overpayment error", async () => {
    mockAuthenticated();

    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "Payment exceeds remaining amount" },
    });

    const result = await updateDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Payment exceeds remaining amount",
    });
  });
});

describe("deleteDebtPayment", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteDebtPayment({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns validation error for invalid payment id", async () => {
    mockAuthenticated();
    const result = await deleteDebtPayment({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("deletes payment successfully", async () => {
    mockAuthenticated();
    mockRpc.mockResolvedValue({
      data: { payment_id: validUuid, transaction_id: "tx-1", debt_id: "debt-1" },
      error: null,
    });

    const result = await deleteDebtPayment({ id: validUuid });
    expect(result).toEqual({ success: true });
    expect(mockRpc).toHaveBeenCalledWith("delete_debt_payment_atomic", {
      p_payment_id: validUuid,
    });
  });
});
