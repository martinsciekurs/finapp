# Phase 2D-i: Category Management — Progress

## Item 20: Database (DONE)
- [x] `category_groups` table — id, user_id, name, type, sort_order, created_at, updated_at
- [x] Constraints: `UNIQUE(id, user_id)` for composite FK, `UNIQUE(user_id, type, name)` for dedup
- [x] RLS: SELECT/INSERT/UPDATE/DELETE scoped by `auth.uid() = user_id`
- [x] `categories` table updated: added `group_id uuid NOT NULL`, composite FK `(group_id, user_id) → category_groups(id, user_id)`
- [x] `budget_limit` column dropped from categories
- [x] `check_category_group_type` trigger — ensures category type matches its group's type
- [x] Database types regenerated (`database.types.ts`)

## Item 21: Zod Schemas + Server Actions (DONE)
- [x] `src/lib/validations/category.ts` — Zod schemas: createCategory, updateCategory, deleteCategory, categoryForm, createGroup, updateGroup, deleteGroup, reorderCategories, reorderGroups + categoryTypeEnum, categoryIconEnum (28 icons)
- [x] `src/lib/types/categories.ts` — TypeScript types: CategoryData, CategoryGroupData
- [x] `src/lib/queries/categories.ts` — fetchCategoriesWithGroups(type), fetchCategoryTransactionCount(id), fetchGroupCategoryCount(id)
- [x] `src/app/dashboard/settings/categories/actions.ts` — 10 server actions: createCategory, updateCategory, deleteCategory, createGroup, updateGroup, deleteGroup, reorderCategories, reorderGroups, getCategoryTransactionCount, getGroupCategoryCount
- [x] All actions return `{ success, data?, error? }`, never throw
- [x] Auth check, input validation, ownership verification, duplicate name detection (23505), type-mismatch guard
- [x] Delete with reassign: categories reassign transactions, groups reassign categories

## Item 22: Settings > Categories Page UI (DONE)
- [x] `src/app/dashboard/settings/categories/page.tsx` — Server component, parallel data fetch
- [x] `src/components/categories/category-manager.tsx` — Main client component with Expense/Income tab toggle, dialog state machine
- [x] `src/components/categories/category-group-section.tsx` — Group card with header (name, add/menu buttons), category list
- [x] `src/components/categories/category-row.tsx` — Category row with colored icon, name, three-dot menu (edit, move to group submenu, delete)
- [x] `src/components/categories/category-form-dialog.tsx` — Add/Edit category dialog (name, icon picker, color picker, group dropdown) using react-hook-form + zod
- [x] `src/components/categories/delete-category-dialog.tsx` — Delete with transaction count check + reassign selector
- [x] `src/components/categories/group-form-dialog.tsx` — Add/Rename group dialog
- [x] `src/components/categories/delete-group-dialog.tsx` — Delete with category count check + reassign selector
- [x] `src/components/categories/icon-picker.tsx` — Popover grid of 28 lucide icons
- [x] `src/components/categories/color-picker.tsx` — Popover grid of 22 earthy preset colors
- [x] shadcn/ui components installed: Dialog, DropdownMenu, Popover

## Item 23: Onboarding Update (DONE)
- [x] `completeOnboarding` creates default expense groups: "Essentials", "Lifestyle", "Health & Growth", "Financial", "Other"
- [x] Creates "Income" group for income categories
- [x] Assigns `group_id` to all categories via lookup map
- [x] Fallback logic: unknown group → "Other" → first available group
- [x] No UI changes — backend only

## Item 24: Dashboard Code Update (DONE)
- [x] `fetchBudgetCategories()` returns `[]` (stubbed until Phase 2D-ii provides `category_budgets`)

## Item 25: Loading Skeleton + Empty States (DONE)
- [x] `src/components/categories/categories-skeleton.tsx` — Page header, tab toggle, 3 group card skeletons
- [x] `src/app/dashboard/settings/categories/loading.tsx` — Next.js loading file
- [x] Empty states: "No {type} groups yet" with CTA, "No categories in this group" per empty group

## Item 26: Tests (DONE)
- [x] pgTAP: `category_groups` RLS tests — 9 new tests (owner CRUD, cross-user denial, anon denial)
- [x] pgTAP: updated `create_test_category_group` helper + updated `create_test_category` (auto-creates group)
- [x] pgTAP: constraint test — replaced `budget_limit` CHECK test with `group_id NOT NULL` test
- [x] Onboarding unit tests — updated all mocks for `category_groups`, added 2 new error-path tests
- [x] Zod schema tests — 48 tests covering all schemas (create/update/delete category, create/update/delete group, reorder, enums)
- [x] Server action tests — 33 tests covering all 10 actions (auth, validation, CRUD, duplicate detection, reassign flows, count queries)
- [x] Component tests — 13 tests (CategoryManager: tab switching, group/category rendering, empty states, action buttons; CategoriesSkeleton: structure)
- [x] All 177 pgTAP tests passing
- [x] All 431 Vitest tests passing
- [x] TypeScript strict mode: zero errors
- [x] ESLint: zero errors, zero warnings

## Test Summary
- **Phase 2D-i tests added (this commit)**: 94 new Vitest tests (48 schema + 33 action + 13 component)
- **Cumulative Vitest total**: 431 tests (up from 337)
- **Cumulative pgTAP total**: 177 tests (unchanged)

## Files Created/Modified
### New files
- `src/lib/validations/category.ts` — Zod schemas
- `src/lib/types/categories.ts` — TypeScript types
- `src/lib/queries/categories.ts` — Server-only query functions
- `src/app/dashboard/settings/categories/actions.ts` — Server actions
- `src/app/dashboard/settings/categories/page.tsx` — Categories page
- `src/app/dashboard/settings/categories/loading.tsx` — Loading skeleton
- `src/components/categories/category-manager.tsx` — Main client component
- `src/components/categories/category-group-section.tsx` — Group section
- `src/components/categories/category-row.tsx` — Category row
- `src/components/categories/category-form-dialog.tsx` — Add/Edit dialog
- `src/components/categories/delete-category-dialog.tsx` — Delete dialog
- `src/components/categories/group-form-dialog.tsx` — Group dialog
- `src/components/categories/delete-group-dialog.tsx` — Delete group dialog
- `src/components/categories/icon-picker.tsx` — Icon picker
- `src/components/categories/color-picker.tsx` — Color picker
- `src/components/categories/categories-skeleton.tsx` — Skeleton
- `src/lib/validations/__tests__/category.test.ts` — Schema tests
- `src/app/dashboard/settings/categories/__tests__/actions.test.ts` — Action tests
- `src/components/categories/__tests__/categories-skeleton.test.tsx` — Skeleton tests
- `src/components/categories/__tests__/category-manager.test.tsx` — Manager tests

### Modified files
- `src/lib/validations/index.ts` — Added category export
- `src/components/ui/dialog.tsx` — Added by shadcn CLI
- `src/components/ui/dropdown-menu.tsx` — Added by shadcn CLI
- `src/components/ui/popover.tsx` — Added by shadcn CLI
