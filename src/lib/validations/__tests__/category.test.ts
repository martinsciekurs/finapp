import { describe, it, expect } from "vitest";
import {
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  categoryFormSchema,
  createGroupSchema,
  updateGroupSchema,
  deleteGroupSchema,
  reorderCategoriesSchema,
  reorderGroupsSchema,
  categoryTypeEnum,
  categoryIconEnum,
} from "../category";

const validUuid = "550e8400-e29b-41d4-a716-446655440000";
const validUuid2 = "660e8400-e29b-41d4-a716-446655440000";

// ────────────────────────────────────────────
// categoryTypeEnum
// ────────────────────────────────────────────

describe("categoryTypeEnum", () => {
  it("accepts expense and income", () => {
    expect(categoryTypeEnum.safeParse("expense").success).toBe(true);
    expect(categoryTypeEnum.safeParse("income").success).toBe(true);
  });

  it("rejects invalid type", () => {
    expect(categoryTypeEnum.safeParse("transfer").success).toBe(false);
    expect(categoryTypeEnum.safeParse("").success).toBe(false);
  });
});

// ────────────────────────────────────────────
// categoryIconEnum
// ────────────────────────────────────────────

describe("categoryIconEnum", () => {
  it("accepts all 28 valid icon names", () => {
    const icons = [
      "baby", "banknote", "book-open", "briefcase", "building-2",
      "car", "circle", "circle-plus", "dog", "dumbbell", "film",
      "gift", "graduation-cap", "heart-pulse", "home", "key",
      "landmark", "laptop", "plane", "repeat", "rotate-ccw",
      "shield", "shopping-bag", "shopping-cart", "sparkles",
      "trending-up", "utensils", "zap",
    ];
    for (const icon of icons) {
      expect(categoryIconEnum.safeParse(icon).success).toBe(true);
    }
  });

  it("rejects invalid icon name", () => {
    expect(categoryIconEnum.safeParse("invalid-icon").success).toBe(false);
    expect(categoryIconEnum.safeParse("").success).toBe(false);
  });
});

// ────────────────────────────────────────────
// createCategorySchema
// ────────────────────────────────────────────

describe("createCategorySchema", () => {
  const validData = {
    name: "Groceries",
    icon: "shopping-cart" as const,
    color: "#4a8c6f",
    type: "expense" as const,
    group_id: validUuid,
  };

  it("accepts valid category data", () => {
    const result = createCategorySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createCategorySchema.safeParse({ ...validData, name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it("accepts name at exactly 50 characters", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      name: "a".repeat(50),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid hex color", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      color: "red",
    });
    expect(result.success).toBe(false);
  });

  it("rejects hex color without # prefix", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      color: "4a8c6f",
    });
    expect(result.success).toBe(false);
  });

  it("rejects 3-digit hex color", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      color: "#abc",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid icon name", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      icon: "nonexistent",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      type: "transfer",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid group_id", () => {
    const result = createCategorySchema.safeParse({
      ...validData,
      group_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const result = createCategorySchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// updateCategorySchema
// ────────────────────────────────────────────

describe("updateCategorySchema", () => {
  it("accepts partial update with only name", () => {
    const result = updateCategorySchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = updateCategorySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({});
    }
  });

  it("validates name constraint when present", () => {
    const result = updateCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("validates color when present", () => {
    const result = updateCategorySchema.safeParse({ color: "invalid" });
    expect(result.success).toBe(false);
  });

  it("validates icon when present", () => {
    const result = updateCategorySchema.safeParse({ icon: "invalid" });
    expect(result.success).toBe(false);
  });

  it("validates group_id when present", () => {
    const result = updateCategorySchema.safeParse({ group_id: "not-uuid" });
    expect(result.success).toBe(false);
  });

  it("accepts full update with all fields", () => {
    const result = updateCategorySchema.safeParse({
      name: "Updated",
      icon: "home",
      color: "#123456",
      group_id: validUuid,
    });
    expect(result.success).toBe(true);
  });
});

// ────────────────────────────────────────────
// deleteCategorySchema
// ────────────────────────────────────────────

describe("deleteCategorySchema", () => {
  it("accepts valid id without reassign_to", () => {
    const result = deleteCategorySchema.safeParse({ id: validUuid });
    expect(result.success).toBe(true);
  });

  it("accepts valid id with reassign_to", () => {
    const result = deleteCategorySchema.safeParse({
      id: validUuid,
      reassign_to: validUuid2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid id", () => {
    const result = deleteCategorySchema.safeParse({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reassign_to", () => {
    const result = deleteCategorySchema.safeParse({
      id: validUuid,
      reassign_to: "bad",
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// categoryFormSchema
// ────────────────────────────────────────────

describe("categoryFormSchema", () => {
  it("accepts valid form data", () => {
    const result = categoryFormSchema.safeParse({
      name: "Groceries",
      icon: "shopping-cart",
      color: "#4a8c6f",
      group_id: validUuid,
    });
    expect(result.success).toBe(true);
  });

  it("does not include type field", () => {
    const result = categoryFormSchema.safeParse({
      name: "Groceries",
      icon: "shopping-cart",
      color: "#4a8c6f",
      group_id: validUuid,
      type: "expense",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("type" in result.data).toBe(false);
    }
  });

  it("rejects missing required fields", () => {
    const result = categoryFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// createGroupSchema
// ────────────────────────────────────────────

describe("createGroupSchema", () => {
  it("accepts valid group data", () => {
    const result = createGroupSchema.safeParse({
      name: "Essentials",
      type: "expense",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createGroupSchema.safeParse({ name: "", type: "expense" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = createGroupSchema.safeParse({
      name: "a".repeat(51),
      type: "expense",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createGroupSchema.safeParse({
      name: "Test",
      type: "other",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = createGroupSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// updateGroupSchema
// ────────────────────────────────────────────

describe("updateGroupSchema", () => {
  it("accepts valid name", () => {
    const result = updateGroupSchema.safeParse({ name: "Lifestyle" });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = updateGroupSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects name over 50 characters", () => {
    const result = updateGroupSchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// deleteGroupSchema
// ────────────────────────────────────────────

describe("deleteGroupSchema", () => {
  it("accepts valid id without reassign_to", () => {
    const result = deleteGroupSchema.safeParse({ id: validUuid });
    expect(result.success).toBe(true);
  });

  it("accepts valid id with reassign_to", () => {
    const result = deleteGroupSchema.safeParse({
      id: validUuid,
      reassign_to: validUuid2,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid id", () => {
    const result = deleteGroupSchema.safeParse({ id: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid reassign_to", () => {
    const result = deleteGroupSchema.safeParse({
      id: validUuid,
      reassign_to: "bad",
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// reorderCategoriesSchema
// ────────────────────────────────────────────

describe("reorderCategoriesSchema", () => {
  it("accepts valid reorder data", () => {
    const result = reorderCategoriesSchema.safeParse({
      items: [
        { id: validUuid, sort_order: 0 },
        { id: validUuid2, sort_order: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = reorderCategoriesSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });

  it("rejects negative sort_order", () => {
    const result = reorderCategoriesSchema.safeParse({
      items: [{ id: validUuid, sort_order: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer sort_order", () => {
    const result = reorderCategoriesSchema.safeParse({
      items: [{ id: validUuid, sort_order: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid uuid in items", () => {
    const result = reorderCategoriesSchema.safeParse({
      items: [{ id: "bad", sort_order: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

// ────────────────────────────────────────────
// reorderGroupsSchema
// ────────────────────────────────────────────

describe("reorderGroupsSchema", () => {
  it("accepts valid reorder data", () => {
    const result = reorderGroupsSchema.safeParse({
      items: [
        { id: validUuid, sort_order: 0 },
        { id: validUuid2, sort_order: 1 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty items array", () => {
    const result = reorderGroupsSchema.safeParse({ items: [] });
    expect(result.success).toBe(false);
  });
});
