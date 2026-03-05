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
  createReminder,
  updateReminder,
  deleteReminder,
  markOccurrencePaid,
  markOccurrenceUnpaid,
} from "../actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fakeUser = { id: "user-uuid-123" };
const validUuid = "550e8400-e29b-41d4-a716-446655440000";

function mockAuthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: fakeUser } });
}

function mockUnauthenticated() {
  mockGetUser.mockResolvedValue({ data: { user: null } });
}

/**
 * Build a chainable query mock for Supabase.
 * Returns a real Promise with fluent query methods attached so it
 * behaves both as a thenable (for `await`) and a query builder.
 */
function chainable(terminalResult: unknown) {
  const chain = Promise.resolve(terminalResult) as Promise<unknown> &
    Record<string, unknown>;

  for (const method of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "in", "gte", "lte", "order", "limit",
  ]) {
    chain[method] = vi.fn().mockReturnValue(chain);
  }

  chain.single = vi.fn().mockResolvedValue(terminalResult);
  chain.maybeSingle = vi.fn().mockResolvedValue(terminalResult);

  return { chain };
}

// ---------------------------------------------------------------------------
// createReminder
// ---------------------------------------------------------------------------

describe("createReminder", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    title: "Rent",
    amount: 800,
    due_date: "2026-04-01",
    frequency: "monthly" as const,
    category_id: validUuid,
    auto_create_transaction: true,
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await createReminder(validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (empty title)", async () => {
    mockAuthenticated();
    const result = await createReminder({ ...validData, title: "" });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("returns error for negative amount", async () => {
    mockAuthenticated();
    const result = await createReminder({ ...validData, amount: -100 });
    expect(result.success).toBe(false);
  });

  it("returns error for invalid frequency", async () => {
    mockAuthenticated();
    const result = await createReminder({
      ...validData,
      frequency: "daily" as never,
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

    const result = await createReminder({
      ...validData,
      category_id: validUuid,
    });
    expect(result).toEqual({ success: false, error: "Category not found" });
  });

  it("returns success on valid create", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.single = vi.fn().mockResolvedValue({
      data: { id: "reminder-id-1" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "reminders") return reminderChain;
      return {};
    });

    const result = await createReminder(validData);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: "reminder-id-1" });
  });

  it("returns error on insert failure", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "reminders") return reminderChain;
      return {};
    });

    const result = await createReminder(validData);
    expect(result).toEqual({
      success: false,
      error: "Failed to create reminder",
    });
  });
});

// ---------------------------------------------------------------------------
// updateReminder
// ---------------------------------------------------------------------------

describe("updateReminder", () => {
  beforeEach(() => vi.clearAllMocks());

  const validData = {
    title: "Updated Rent",
    amount: 900,
    due_date: "2026-05-01",
    frequency: "monthly" as const,
    category_id: validUuid,
    auto_create_transaction: false,
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await updateReminder(validUuid, validData);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid data (empty title)", async () => {
    mockAuthenticated();
    const result = await updateReminder(validUuid, {
      ...validData,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("returns success on valid update", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "reminders") return reminderChain;
      return {};
    });

    const result = await updateReminder(validUuid, validData);
    expect(result).toEqual({ success: true });
  });

  it("returns error when reminder not found", async () => {
    mockAuthenticated();
    const { chain: catChain } = chainable({
      data: { id: validUuid },
      error: null,
    });
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "categories") return catChain;
      if (table === "reminders") return reminderChain;
      return {};
    });

    const result = await updateReminder(validUuid, validData);
    expect(result).toEqual({
      success: false,
      error: "Reminder not found",
    });
  });

  it("returns error for invalid id", async () => {
    const result = await updateReminder("bad-id", validData);
    expect(result).toEqual({ success: false, error: "Invalid reminder ID" });
  });
});

// ---------------------------------------------------------------------------
// deleteReminder
// ---------------------------------------------------------------------------

describe("deleteReminder", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await deleteReminder({ id: validUuid });
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid UUID", async () => {
    mockAuthenticated();
    const result = await deleteReminder({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("returns success when reminder is deleted", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: validUuid }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return chain;
      return {};
    });

    const result = await deleteReminder({ id: validUuid });
    expect(result).toEqual({ success: true });
  });

  it("returns error when reminder not found", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return chain;
      return {};
    });

    const result = await deleteReminder({ id: validUuid });
    expect(result).toEqual({
      success: false,
      error: "Reminder not found",
    });
  });
});

// ---------------------------------------------------------------------------
// markOccurrencePaid
// ---------------------------------------------------------------------------

describe("markOccurrencePaid", () => {
  beforeEach(() => vi.clearAllMocks());

  const validPayload = {
    reminder_id: validUuid,
    due_date: "2026-04-01",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid reminder_id", async () => {
    mockAuthenticated();
    const result = await markOccurrencePaid({
      reminder_id: "bad",
      due_date: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("returns error for invalid due_date", async () => {
    mockAuthenticated();
    const result = await markOccurrencePaid({
      reminder_id: validUuid,
      due_date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("returns error when reminder not found", async () => {
    mockAuthenticated();
    const { chain: reminderChain } = chainable({ data: null, error: null });
    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "Reminder not found",
    });
  });

  it("returns error when occurrence is already paid (unique constraint)", async () => {
    mockAuthenticated();

    // Reminder fetch succeeds
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: null,
        auto_create_transaction: false,
      },
      error: null,
    });

    // Reserve insert fails with unique_violation
    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "23505", message: "duplicate key" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") return paymentChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "This occurrence is already paid",
    });
  });

  it("creates payment record without transaction when auto_create is false", async () => {
    mockAuthenticated();

    // Reminder fetch
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: null,
        auto_create_transaction: false,
      },
      error: null,
    });

    // Reserve payment succeeds
    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: { id: "pay-id-1" },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") return paymentChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({ success: true });
    // Verify no transaction was created
    expect(mockFrom).not.toHaveBeenCalledWith("transactions");
  });

  it("creates payment record AND transaction when auto_create is true with category", async () => {
    mockAuthenticated();
    const catId = "660e8400-e29b-41d4-a716-446655440000";

    // Reminder fetch
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Monthly Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: catId,
        auto_create_transaction: true,
      },
      error: null,
    });

    // Reserve payment succeeds
    const { chain: reserveChain } = chainable(undefined);
    reserveChain.single = vi.fn().mockResolvedValue({
      data: { id: "pay-id-2" },
      error: null,
    });

    // Transaction insert succeeds
    const { chain: txChain } = chainable(undefined);
    txChain.single = vi.fn().mockResolvedValue({
      data: { id: "tx-id-1" },
      error: null,
    });

    // Update payment to link transaction (second reminder_payments call)
    const { chain: updatePayChain } = chainable(undefined);
    updatePayChain.maybeSingle = vi.fn().mockResolvedValue({
      data: { id: "pay-id-2" },
      error: null,
    });

    let paymentCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") {
        paymentCalls++;
        return paymentCalls === 1 ? reserveChain : updatePayChain;
      }
      if (table === "transactions") return txChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({ success: true });
    // Verify transaction was created
    expect(mockFrom).toHaveBeenCalledWith("transactions");
  });

  // category_id is now NOT NULL — the "no category" scenario is impossible

  it("rolls back reserved payment when transaction insert fails", async () => {
    mockAuthenticated();
    const catId = "660e8400-e29b-41d4-a716-446655440000";

    // Reminder fetch
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: catId,
        auto_create_transaction: true,
      },
      error: null,
    });

    // Reserve payment succeeds
    const { chain: reserveChain } = chainable(undefined);
    reserveChain.single = vi.fn().mockResolvedValue({
      data: { id: "pay-id-rb" },
      error: null,
    });

    // Transaction insert fails
    const { chain: txChain } = chainable(undefined);
    txChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB insert error" },
    });

    // Rollback: delete reserved payment succeeds
    const { chain: rollbackChain } = chainable({
      data: null,
      error: null,
    });

    let paymentCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") {
        paymentCalls++;
        return paymentCalls === 1 ? reserveChain : rollbackChain;
      }
      if (table === "transactions") return txChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "Failed to create transaction",
    });
    // Verify rollback was attempted (second call to reminder_payments)
    expect(paymentCalls).toBe(2);
  });

  it("surfaces rollback failure when transaction insert and rollback both fail", async () => {
    mockAuthenticated();
    const catId = "660e8400-e29b-41d4-a716-446655440000";

    // Reminder fetch
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: catId,
        auto_create_transaction: true,
      },
      error: null,
    });

    // Reserve payment succeeds
    const { chain: reserveChain } = chainable(undefined);
    reserveChain.single = vi.fn().mockResolvedValue({
      data: { id: "pay-id-rb2" },
      error: null,
    });

    // Transaction insert fails
    const { chain: txChain } = chainable(undefined);
    txChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB insert error" },
    });

    // Rollback: delete reserved payment also fails
    const { chain: rollbackChain } = chainable({
      data: null,
      error: { message: "rollback delete error" },
    });

    let paymentCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") {
        paymentCalls++;
        return paymentCalls === 1 ? reserveChain : rollbackChain;
      }
      if (table === "transactions") return txChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result.success).toBe(false);
    // Error message should be generic — no internal details
    expect(result.error).toBe(
      "Failed to create transaction and rollback failed. Please contact support."
    );
  });

  it("surfaces rollback failure when link update fails and rollback fails", async () => {
    mockAuthenticated();
    const catId = "660e8400-e29b-41d4-a716-446655440000";

    // Reminder fetch
    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: catId,
        auto_create_transaction: true,
      },
      error: null,
    });

    // Reserve payment succeeds
    const { chain: reserveChain } = chainable(undefined);
    reserveChain.single = vi.fn().mockResolvedValue({
      data: { id: "pay-id-link" },
      error: null,
    });

    // Transaction insert succeeds
    const { chain: txChain } = chainable(undefined);
    txChain.single = vi.fn().mockResolvedValue({
      data: { id: "tx-id-link" },
      error: null,
    });

    // Link update fails (second reminder_payments call)
    const { chain: linkChain } = chainable(undefined);
    linkChain.maybeSingle = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "link update error" },
    });

    // Rollback: delete transaction fails
    const { chain: rbTxChain } = chainable({
      data: null,
      error: { message: "rb tx delete error" },
    });

    // Rollback: delete payment fails
    const { chain: rbPayChain } = chainable({
      data: null,
      error: { message: "rb pay delete error" },
    });

    let paymentCalls = 0;
    let txCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") {
        paymentCalls++;
        if (paymentCalls === 1) return reserveChain;
        if (paymentCalls === 2) return linkChain;
        return rbPayChain;
      }
      if (table === "transactions") {
        txCalls++;
        return txCalls === 1 ? txChain : rbTxChain;
      }
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result.success).toBe(false);
    // Error message should be generic — no internal details
    expect(result.error).toBe(
      "Failed to link transaction to payment and rollback failed. Please contact support."
    );
  });

  it("returns error when payment insert fails", async () => {
    mockAuthenticated();

    const { chain: reminderChain } = chainable(undefined);
    reminderChain.maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: validUuid,
        title: "Rent",
        amount: 800,
        due_date: "2026-04-01",
        frequency: "monthly",
        category_id: null,
        auto_create_transaction: false,
      },
      error: null,
    });

    // Reserve insert fails (non-unique error)
    const { chain: paymentChain } = chainable(undefined);
    paymentChain.single = vi.fn().mockResolvedValue({
      data: null,
      error: { code: "42000", message: "DB error" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminders") return reminderChain;
      if (table === "reminder_payments") return paymentChain;
      return {};
    });

    const result = await markOccurrencePaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "Failed to record payment",
    });
  });
});

// ---------------------------------------------------------------------------
// markOccurrenceUnpaid
// ---------------------------------------------------------------------------

describe("markOccurrenceUnpaid", () => {
  beforeEach(() => vi.clearAllMocks());

  const validPayload = {
    reminder_id: validUuid,
    due_date: "2026-04-01",
  };

  it("returns error when not authenticated", async () => {
    mockUnauthenticated();
    const result = await markOccurrenceUnpaid(validPayload);
    expect(result).toEqual({ success: false, error: "Not authenticated" });
  });

  it("returns error for invalid reminder_id", async () => {
    mockAuthenticated();
    const result = await markOccurrenceUnpaid({
      reminder_id: "bad",
      due_date: "2026-04-01",
    });
    expect(result.success).toBe(false);
  });

  it("returns error for invalid due_date", async () => {
    mockAuthenticated();
    const result = await markOccurrenceUnpaid({
      reminder_id: validUuid,
      due_date: "not-a-date",
    });
    expect(result.success).toBe(false);
  });

  it("returns success when payment record is deleted", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [{ id: "payment-id-1" }],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminder_payments") return chain;
      return {};
    });

    const result = await markOccurrenceUnpaid(validPayload);
    expect(result).toEqual({ success: true });
  });

  it("returns error when payment record not found", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: [],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminder_payments") return chain;
      return {};
    });

    const result = await markOccurrenceUnpaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "Payment record not found",
    });
  });

  it("returns error when delete fails", async () => {
    mockAuthenticated();
    const { chain } = chainable(undefined);
    chain.select = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "DB error" },
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "reminder_payments") return chain;
      return {};
    });

    const result = await markOccurrenceUnpaid(validPayload);
    expect(result).toEqual({
      success: false,
      error: "Failed to remove payment",
    });
  });
});
