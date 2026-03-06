import { beforeEach, describe, expect, it, vi } from "vitest";

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

  it("returns not found when no rows deleted", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({ data: [], error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return chain;
      return {};
    });

    const result = await deleteDebt({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Debt not found" });
  });

  it("deletes debt successfully", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return chain;
      return {};
    });

    const result = await deleteDebt({ id: validUuid });
    expect(result).toEqual({ success: true });
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

  it("returns error when debt not found", async () => {
    mockAuthenticated();
    const { chain: debtsChain } = chainable({ data: null, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({ success: false, error: "Debt not found" });
  });

  it("rejects payment larger than remaining amount", async () => {
    mockAuthenticated();
    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 20,
        category_id: validUuid,
      },
      error: null,
    });

    const { chain: categoriesChain } = chainable(undefined);
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      if (table === "categories") return categoriesChain;
      return {};
    });

    const result = await recordDebtPayment({ ...validData, amount: 100 });
    expect(result).toEqual({
      success: false,
      error: "Payment exceeds remaining amount",
    });
  });

  it("returns error when no payment category exists", async () => {
    mockAuthenticated();

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 100,
        category_id: null,
      },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Debt has no category. Edit debt and choose a category first.",
    });
  });

  it("returns error when linked transaction insert fails", async () => {
    mockAuthenticated();

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 100,
        category_id: validUuid,
      },
      error: null,
    });

    const { chain: categoriesChain } = chainable({ data: { id: validUuid, type: "expense" }, error: null });
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: transactionsChain } = chainable(undefined);
    transactionsChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "insert failed" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      if (table === "categories") return categoriesChain;
      if (table === "transactions") return transactionsChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to create linked transaction",
    });
  });

  it("rolls back transaction when debt payment insert fails", async () => {
    mockAuthenticated();

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 100,
        category_id: validUuid,
      },
      error: null,
    });

    const { chain: categoriesChain } = chainable({ data: { id: validUuid, type: "expense" }, error: null });
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: transactionInsertChain } = chainable(undefined);
    transactionInsertChain.single = vi.fn().mockResolvedValue({
      data: { id: "tx-1" },
      error: null,
    });

    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "payment failed" },
    });

    const { chain: rollbackChain } = chainable({ data: null, error: null });

    let transactionCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      if (table === "categories") return categoriesChain;
      if (table === "transactions") {
        transactionCalls += 1;
        return transactionCalls === 1 ? transactionInsertChain : rollbackChain;
      }
      if (table === "debt_payments") return paymentChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to record debt payment",
    });
  });

  it("returns support message when payment insert and rollback both fail", async () => {
    mockAuthenticated();

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 100,
        category_id: validUuid,
      },
      error: null,
    });

    const { chain: categoriesChain } = chainable({ data: { id: validUuid, type: "expense" }, error: null });
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: transactionInsertChain } = chainable(undefined);
    transactionInsertChain.single = vi.fn().mockResolvedValue({
      data: { id: "tx-1" },
      error: null,
    });

    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "payment failed" },
    });

    const { chain: rollbackChain } = chainable({
      data: null,
      error: { message: "rollback failed" },
    });

    let transactionCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      if (table === "categories") return categoriesChain;
      if (table === "transactions") {
        transactionCalls += 1;
        return transactionCalls === 1 ? transactionInsertChain : rollbackChain;
      }
      if (table === "debt_payments") return paymentChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to record payment and rollback failed. Please contact support.",
    });
  });

  it("records debt payment with linked transaction", async () => {
    mockAuthenticated();

    const { chain: debtsChain } = chainable(undefined);
    debtsChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        counterparty: "John",
        type: "i_owe",
        remaining_amount: 100,
        category_id: validUuid,
      },
      error: null,
    });

    const { chain: categoriesChain } = chainable({ data: { id: validUuid, type: "expense" }, error: null });
    categoriesChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: validUuid, type: "expense" },
      error: null,
    });

    const { chain: transactionInsertChain } = chainable(undefined);
    transactionInsertChain.single = vi.fn().mockResolvedValue({
      data: { id: "tx-1" },
      error: null,
    });

    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: { id: "payment-1" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtsChain;
      if (table === "categories") return categoriesChain;
      if (table === "transactions") return transactionInsertChain;
      if (table === "debt_payments") return paymentChain;
      return {};
    });

    const result = await recordDebtPayment(validData);
    expect(result).toEqual({ success: true, data: { id: "payment-1" } });
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
      },
      error: null,
    });

    const { chain: paymentsCountChain } = chainable({ count: 1, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtsChain;
      if (table === "debt_payments") return paymentsCountChain;
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
      },
      error: null,
    });

    const { chain: paymentsCountChain } = chainable({ count: 0, error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debts") return debtsChain;
      if (table === "debt_payments") return paymentsCountChain;
      return {};
    });

    const result = await updateDebt({ ...validData, original_amount: 50 });
    expect(result).toEqual({
      success: false,
      error: "Original amount cannot be below already paid amount",
    });
  });

  it("updates debt successfully", async () => {
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
      },
      error: null,
    });

    const { chain: paymentsCountChain } = chainable({ count: 0, error: null });

    const { chain: debtUpdateChain } = chainable(undefined);
    debtUpdateChain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    let debtCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return categoriesChain;
      if (table === "debt_payments") return paymentsCountChain;
      if (table === "debts") {
        debtCalls += 1;
        return debtCalls === 1 ? debtSelectChain : debtUpdateChain;
      }
      return {};
    });

    const result = await updateDebt(validData);
    expect(result).toEqual({ success: true });
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

  it("updates payment and linked transaction successfully", async () => {
    mockAuthenticated();

    const { chain: paymentFetchChain } = chainable(undefined);
    paymentFetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        debt_id: "debt-uuid-1",
        amount: 40,
        note: "Old note",
        transaction_id: "tx-1",
      },
      error: null,
    });

    const { chain: debtFetchChain } = chainable(undefined);
    debtFetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { remaining_amount: 60, counterparty: "John", type: "i_owe" },
      error: null,
    });

    const { chain: paymentUpdateChain } = chainable(undefined);
    paymentUpdateChain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    const { chain: transactionUpdateChain } = chainable({ error: null });

    let debtPaymentCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtFetchChain;
      if (table === "transactions") return transactionUpdateChain;
      if (table === "debt_payments") {
        debtPaymentCalls += 1;
        return debtPaymentCalls === 1 ? paymentFetchChain : paymentUpdateChain;
      }
      return {};
    });

    const result = await updateDebtPayment(validData);
    expect(result).toEqual({ success: true });
  });

  it("rolls back debt payment when linked transaction update fails", async () => {
    mockAuthenticated();

    const { chain: paymentFetchChain } = chainable(undefined);
    paymentFetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        debt_id: "debt-uuid-1",
        amount: 40,
        note: "Old note",
        transaction_id: "tx-1",
      },
      error: null,
    });

    const { chain: debtFetchChain } = chainable(undefined);
    debtFetchChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { remaining_amount: 60, counterparty: "John", type: "i_owe" },
      error: null,
    });

    const { chain: paymentUpdateChain } = chainable(undefined);
    paymentUpdateChain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    const { chain: transactionUpdateChain } = chainable({
      error: { message: "transaction update failed" },
    });

    const { chain: rollbackPaymentChain } = chainable({ data: null, error: null });

    let debtPaymentCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "debts") return debtFetchChain;
      if (table === "transactions") return transactionUpdateChain;
      if (table === "debt_payments") {
        debtPaymentCalls += 1;
        if (debtPaymentCalls === 1) return paymentFetchChain;
        if (debtPaymentCalls === 2) return paymentUpdateChain;
        return rollbackPaymentChain;
      }
      return {};
    });

    const result = await updateDebtPayment(validData);
    expect(rollbackPaymentChain.update).toHaveBeenCalledWith({
      amount: 40,
      note: "Old note",
    });
    expect(result).toEqual({
      success: false,
      error: "Failed to update linked transaction",
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
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "debt_payments") return chain;
      return {};
    });

    const result = await deleteDebtPayment({ id: validUuid });
    expect(result).toEqual({ success: true });
  });
});
