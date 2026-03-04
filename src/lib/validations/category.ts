import { z } from "zod";

// ────────────────────────────────────────────
// Shared
// ────────────────────────────────────────────

export const categoryTypeEnum = z.enum(["expense", "income"]);

const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name must be 50 characters or less");

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Invalid hex color");

// All 28 icon names from CategoryIcon component
export const categoryIconNames = [
  "baby",
  "banknote",
  "book-open",
  "briefcase",
  "building-2",
  "car",
  "circle",
  "circle-plus",
  "dog",
  "dumbbell",
  "film",
  "gift",
  "graduation-cap",
  "heart-pulse",
  "home",
  "key",
  "landmark",
  "laptop",
  "plane",
  "repeat",
  "rotate-ccw",
  "shield",
  "shopping-bag",
  "shopping-cart",
  "sparkles",
  "trending-up",
  "utensils",
  "zap",
] as const;

export const categoryIconEnum = z.enum(categoryIconNames);

// ────────────────────────────────────────────
// Category schemas
// ────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: nameSchema,
  icon: categoryIconEnum,
  color: hexColorSchema,
  type: categoryTypeEnum,
  group_id: z.string().uuid("Invalid group"),
});

export const updateCategorySchema = z.object({
  name: nameSchema,
  icon: categoryIconEnum,
  color: hexColorSchema,
  group_id: z.string().uuid("Invalid group"),
}).partial();

export const deleteCategorySchema = z.object({
  /** ID of the category to delete */
  id: z.string().uuid("Invalid category ID"),
  /** If transactions exist, reassign them to this category */
  reassign_to: z.string().uuid("Invalid reassign category ID").optional(),
});

/** Form-only schema for add/edit category dialog (excludes `type` which is set from the tab). */
export const categoryFormSchema = z.object({
  name: nameSchema,
  icon: categoryIconEnum,
  color: hexColorSchema,
  group_id: z.string().uuid("Invalid group"),
});

// ────────────────────────────────────────────
// Group schemas
// ────────────────────────────────────────────

export const createGroupSchema = z.object({
  name: nameSchema,
  type: categoryTypeEnum,
});

export const updateGroupSchema = z.object({
  name: nameSchema,
});

export const deleteGroupSchema = z.object({
  /** ID of the group to delete */
  id: z.string().uuid("Invalid group ID"),
  /** If the group has categories, move them to this group */
  reassign_to: z.string().uuid("Invalid reassign group ID").optional(),
});

// ────────────────────────────────────────────
// Reorder schemas
// ────────────────────────────────────────────

const reorderItemSchema = z.object({
  id: z.string().uuid(),
  sort_order: z.number().int().nonnegative(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(reorderItemSchema).min(1, "At least one item required"),
});

export const reorderGroupsSchema = z.object({
  items: z.array(reorderItemSchema).min(1, "At least one item required"),
});

// ────────────────────────────────────────────
// Type exports
// ────────────────────────────────────────────

export type CreateCategoryValues = z.infer<typeof createCategorySchema>;
export type UpdateCategoryValues = z.infer<typeof updateCategorySchema>;
export type DeleteCategoryValues = z.infer<typeof deleteCategorySchema>;
export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export type CreateGroupValues = z.infer<typeof createGroupSchema>;
export type UpdateGroupValues = z.infer<typeof updateGroupSchema>;
export type DeleteGroupValues = z.infer<typeof deleteGroupSchema>;

export type ReorderCategoriesValues = z.infer<typeof reorderCategoriesSchema>;
export type ReorderGroupsValues = z.infer<typeof reorderGroupsSchema>;
