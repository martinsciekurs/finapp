# Phase 2D-i: Category Management — Progress

## Item 20: Database (DONE)
- [x] `category_groups` table — id, user_id, name, type, sort_order, created_at, updated_at
- [x] Constraints: `UNIQUE(id, user_id)` for composite FK, `UNIQUE(user_id, type, name)` for dedup
- [x] RLS: SELECT/INSERT/UPDATE/DELETE scoped by `auth.uid() = user_id`
- [x] `categories` table updated: added `group_id uuid NOT NULL`, composite FK `(group_id, user_id) → category_groups(id, user_id)`
- [x] `budget_limit` column dropped from categories
- [x] `check_category_group_type` trigger — ensures category type matches its group's type
- [x] Database types regenerated (`database.types.ts`)

## Item 23: Onboarding Update (DONE)
- [x] `completeOnboarding` creates default expense groups: "Essentials", "Lifestyle", "Health & Growth", "Financial", "Other"
- [x] Creates "Income" group for income categories
- [x] Assigns `group_id` to all categories via lookup map
- [x] Fallback logic: unknown group → "Other" → first available group
- [x] No UI changes — backend only

## Item 24: Dashboard Code Update (DONE)
- [x] `fetchBudgetCategories()` returns `[]` (stubbed until Phase 2D-ii provides `category_budgets`)

## Item 26: Tests (PARTIAL)
- [x] pgTAP: `category_groups` RLS tests — 9 new tests (owner CRUD, cross-user denial, anon denial)
- [x] pgTAP: updated `create_test_category_group` helper + updated `create_test_category` (auto-creates group)
- [x] pgTAP: constraint test — replaced `budget_limit` CHECK test with `group_id NOT NULL` test
- [x] Onboarding unit tests — updated all mocks for `category_groups`, added 2 new error-path tests (groups upsert fails, groups fetch fails)
- [x] All 177 pgTAP tests passing
- [x] All 337 Vitest tests passing

## Not Yet Started
- [ ] Item 21: Zod schemas + server actions for category and group CRUD
- [ ] Item 22: Settings > Categories page UI (components, dialogs, icon/color pickers)
- [ ] Item 25: Loading skeleton + empty states for categories page
- [ ] Item 26 (remaining): Zod schema tests, component unit tests, server action integration tests

## Deferred (removed to avoid shipping unwired code)
The following were created during development but deleted because no UI consumes them yet. They will be re-created alongside the Settings > Categories page UI:
- `src/lib/validations/category.ts` — Zod schemas for category/group CRUD
- `src/lib/queries/categories.ts` — query functions
- `src/lib/types/categories.ts` — TypeScript types
- `src/app/dashboard/settings/categories/actions.ts` — server actions

## Test Summary
- **Phase 2D-i tests added**: 11 new tests (9 pgTAP RLS + 2 Vitest onboarding error paths)
- **Cumulative Vitest total**: 337 tests (21 onboarding tests, up from 19)
- **Cumulative pgTAP total**: 177 tests (up from 167)
