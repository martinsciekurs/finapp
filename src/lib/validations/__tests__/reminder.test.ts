import { describe, it, expect } from "vitest";
import {
  createReminderSchema,
  updateReminderSchema,
  deleteReminderSchema,
  markOccurrencePaidSchema,
  markOccurrenceUnpaidSchema,
  reminderFrequencyEnum,
  reminderFormSchema,
} from "../reminder";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";

// ---------------------------------------------------------------------------
// reminderFrequencyEnum
// ---------------------------------------------------------------------------

describe("reminderFrequencyEnum", () => {
  it("accepts valid frequencies", () => {
    expect(reminderFrequencyEnum.safeParse("monthly").success).toBe(true);
    expect(reminderFrequencyEnum.safeParse("weekly").success).toBe(true);
    expect(reminderFrequencyEnum.safeParse("yearly").success).toBe(true);
    expect(reminderFrequencyEnum.safeParse("one_time").success).toBe(true);
  });

  it("rejects invalid frequency", () => {
    expect(reminderFrequencyEnum.safeParse("daily").success).toBe(false);
    expect(reminderFrequencyEnum.safeParse("").success).toBe(false);
    expect(reminderFrequencyEnum.safeParse(null).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// createReminderSchema
// ---------------------------------------------------------------------------

describe("createReminderSchema", () => {
  const validData = {
    title: "Rent",
    amount: 800,
    due_date: "2026-04-01",
    frequency: "monthly" as const,
    category_id: validUuid,
    auto_create_transaction: true,
  };

  it("accepts valid data with all fields", () => {
    expect(createReminderSchema.safeParse(validData).success).toBe(true);
  });

  it("defaults auto_create_transaction to true", () => {
    const result = createReminderSchema.safeParse({
      title: validData.title,
      amount: validData.amount,
      due_date: validData.due_date,
      frequency: validData.frequency,
      category_id: validData.category_id,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.auto_create_transaction).toBe(true);
    }
  });

  it("rejects empty title", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, title: "" }).success
    ).toBe(false);
  });

  it("rejects title over 100 characters", () => {
    expect(
      createReminderSchema.safeParse({
        ...validData,
        title: "a".repeat(101),
      }).success
    ).toBe(false);
  });

  it("accepts title at exactly 100 characters", () => {
    expect(
      createReminderSchema.safeParse({
        ...validData,
        title: "a".repeat(100),
      }).success
    ).toBe(true);
  });

  it("rejects missing title", () => {
    expect(
      createReminderSchema.safeParse({
        amount: validData.amount,
        due_date: validData.due_date,
        frequency: validData.frequency,
        category_id: validData.category_id,
        auto_create_transaction: validData.auto_create_transaction,
      }).success
    ).toBe(false);
  });

  it("rejects missing amount", () => {
    expect(
      createReminderSchema.safeParse({
        title: validData.title,
        due_date: validData.due_date,
        frequency: validData.frequency,
        category_id: validData.category_id,
        auto_create_transaction: validData.auto_create_transaction,
      }).success
    ).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: 0 }).success
    ).toBe(false);
  });

  it("rejects negative amount", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: -100 }).success
    ).toBe(false);
  });

  it("accepts decimal amount", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: 99.99 }).success
    ).toBe(true);
  });

  it("rejects amount exceeding numeric(12,2) max", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: 10000000000 })
        .success
    ).toBe(false);
  });

  it("accepts amount at numeric(12,2) max", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: 9999999999.99 })
        .success
    ).toBe(true);
  });

  it("rejects amount with more than two decimal places", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, amount: 12.345 }).success
    ).toBe(false);
  });

  it("rejects invalid due_date format", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, due_date: "not-a-date" })
        .success
    ).toBe(false);
  });

  it("rejects missing due_date", () => {
    expect(
      createReminderSchema.safeParse({
        title: validData.title,
        amount: validData.amount,
        frequency: validData.frequency,
        category_id: validData.category_id,
        auto_create_transaction: validData.auto_create_transaction,
      }).success
    ).toBe(false);
  });

  it("rejects missing category_id", () => {
    expect(
      createReminderSchema.safeParse({
        title: validData.title,
        amount: validData.amount,
        due_date: validData.due_date,
        frequency: validData.frequency,
        auto_create_transaction: validData.auto_create_transaction,
      }).success
    ).toBe(false);
  });

  it("rejects invalid frequency", () => {
    expect(
      createReminderSchema.safeParse({ ...validData, frequency: "daily" })
        .success
    ).toBe(false);
  });

  it("rejects invalid category_id", () => {
    expect(
      createReminderSchema.safeParse({
        ...validData,
        category_id: "not-a-uuid",
      }).success
    ).toBe(false);
  });

});

// ---------------------------------------------------------------------------
// updateReminderSchema
// ---------------------------------------------------------------------------

describe("updateReminderSchema", () => {
  const validData = {
    title: "Updated Rent",
    amount: 900,
    due_date: "2026-05-01",
    frequency: "monthly" as const,
    category_id: validUuid,
    auto_create_transaction: false,
  };

  it("accepts valid data", () => {
    expect(updateReminderSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects missing category_id", () => {
    const noCategory: Partial<typeof validData> = { ...validData };
    delete noCategory.category_id;
    expect(updateReminderSchema.safeParse(noCategory).success).toBe(false);
  });

  it("rejects empty title", () => {
    expect(
      updateReminderSchema.safeParse({ ...validData, title: "" }).success
    ).toBe(false);
  });

  it("rejects zero amount", () => {
    expect(
      updateReminderSchema.safeParse({ ...validData, amount: 0 }).success
    ).toBe(false);
  });

  it("rejects invalid frequency", () => {
    expect(
      updateReminderSchema.safeParse({ ...validData, frequency: "biweekly" })
        .success
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deleteReminderSchema
// ---------------------------------------------------------------------------

describe("deleteReminderSchema", () => {
  it("accepts valid UUID", () => {
    expect(
      deleteReminderSchema.safeParse({ id: validUuid }).success
    ).toBe(true);
  });

  it("rejects invalid UUID", () => {
    expect(
      deleteReminderSchema.safeParse({ id: "not-a-uuid" }).success
    ).toBe(false);
  });

  it("rejects missing id", () => {
    expect(deleteReminderSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markOccurrencePaidSchema
// ---------------------------------------------------------------------------

describe("markOccurrencePaidSchema", () => {
  it("accepts valid reminder_id and due_date", () => {
    expect(
      markOccurrencePaidSchema.safeParse({
        reminder_id: validUuid,
        due_date: "2026-04-01",
      }).success
    ).toBe(true);
  });

  it("rejects invalid reminder_id", () => {
    expect(
      markOccurrencePaidSchema.safeParse({
        reminder_id: "not-a-uuid",
        due_date: "2026-04-01",
      }).success
    ).toBe(false);
  });

  it("rejects invalid due_date", () => {
    expect(
      markOccurrencePaidSchema.safeParse({
        reminder_id: validUuid,
        due_date: "not-a-date",
      }).success
    ).toBe(false);
  });

  it("rejects missing reminder_id", () => {
    expect(
      markOccurrencePaidSchema.safeParse({
        due_date: "2026-04-01",
      }).success
    ).toBe(false);
  });

  it("rejects missing due_date", () => {
    expect(
      markOccurrencePaidSchema.safeParse({
        reminder_id: validUuid,
      }).success
    ).toBe(false);
  });

  it("rejects empty object", () => {
    expect(markOccurrencePaidSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// markOccurrenceUnpaidSchema
// ---------------------------------------------------------------------------

describe("markOccurrenceUnpaidSchema", () => {
  it("accepts valid reminder_id and due_date", () => {
    expect(
      markOccurrenceUnpaidSchema.safeParse({
        reminder_id: validUuid,
        due_date: "2026-04-01",
      }).success
    ).toBe(true);
  });

  it("rejects invalid reminder_id", () => {
    expect(
      markOccurrenceUnpaidSchema.safeParse({
        reminder_id: "not-a-uuid",
        due_date: "2026-04-01",
      }).success
    ).toBe(false);
  });

  it("rejects invalid due_date", () => {
    expect(
      markOccurrenceUnpaidSchema.safeParse({
        reminder_id: validUuid,
        due_date: "bad-date",
      }).success
    ).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(markOccurrenceUnpaidSchema.safeParse({}).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reminderFormSchema
// ---------------------------------------------------------------------------

describe("reminderFormSchema", () => {
  const validData = {
    title: "Gym",
    amount: 50,
    due_date: "2026-04-01",
    frequency: "monthly" as const,
    category_id: validUuid,
    auto_create_transaction: true,
  };

  it("accepts valid data", () => {
    expect(reminderFormSchema.safeParse(validData).success).toBe(true);
  });

  it("rejects missing auto_create_transaction (no default)", () => {
    expect(
      reminderFormSchema.safeParse({
        title: validData.title,
        amount: validData.amount,
        due_date: validData.due_date,
        frequency: validData.frequency,
        category_id: validData.category_id,
      }).success
    ).toBe(false);
  });

  it("rejects missing category_id", () => {
    const noCategory: Partial<typeof validData> = { ...validData };
    delete noCategory.category_id;
    expect(reminderFormSchema.safeParse(noCategory).success).toBe(false);
  });
});
