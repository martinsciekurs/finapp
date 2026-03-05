# Phase 2D-ii: Budget System — Progress

## Database Migration (DONE)
- [x] `category_budgets` table — id, user_id, category_id, year_month, amount, created_at, updated_at
- [x] Composite FK `(category_id, user_id) → categories(id, user_id)` for RLS alignment
- [x] `UNIQUE(user_id, category_id, year_month)` — one budget per category per month
- [x] CHECK constraints: amount > 0, year_month format `YYYY-MM`
- [x] `monthly_income_targets` table — id, user_id, year_month, amount, created_at, updated_at
- [x] `UNIQUE(user_id, year_month)` — one income target per month
- [x] CHECK constraints: amount > 0, year_month format `YYYY-MM`
- [x] RLS: SELECT/INSERT/UPDATE/DELETE scoped by `auth.uid() = user_id` on both tables
- [x] `set_updated_at` triggers on both tables
- [x] Indexes: `category_budgets(user_id, year_month)`, `monthly_income_targets(user_id, year_month)`

## Zod Schemas (DONE)
- [x] `src/lib/validations/budget.ts` — 6 schemas: yearMonthSchema, upsertCategoryBudgetSchema, removeCategoryBudgetSchema, bulkUpsertCategoryBudgetsSchema (.max(500)), upsertIncomeTargetSchema, removeIncomeTargetSchema
- [x] All inferred types exported
- [x] `bulkUpsertCategoryBudgetsSchema` reuses `upsertCategoryBudgetSchema` internally (R7 fix)

## Types (DONE)
- [x] `src/lib/types/budget.ts` — BudgetCategoryItem, UnbudgetedCategoryItem, BudgetSummary, BudgetGroupData, BudgetPageData, PlanCell, PlanCategoryRow, PlanIncomeRow, PlannerData, SpendingSuggestion

## Queries (DONE)
- [x] `src/lib/queries/budget.ts` — `fetchBudgetPageData(yearMonth)`, `fetchPlannerData(year)`, `fetchSpendingSuggestions()`
- [x] Smart suggestions: 3-month average, divides by actual months with data, rounds up to nearest 10

## Dashboard Integration (DONE)
- [x] `fetchBudgetCategories()` in `src/lib/queries/dashboard.ts` unstubbed — now queries `category_budgets` joined with `categories`
- [x] Existing `BudgetOverview` widget works without changes (9 existing tests still pass)

## Server Actions (DONE)
- [x] `src/app/dashboard/budget/actions.ts` — 5 actions: upsertCategoryBudget, removeCategoryBudget, bulkUpsertCategoryBudgets, upsertIncomeTarget, removeIncomeTarget
- [x] All return `{ success, data?, error? }`, never throw
- [x] Auth check + Zod validation on every action

## Track Mode UI (DONE)
- [x] `src/app/dashboard/budget/page.tsx` — Server Component, validates URL params (month, year, view), parallel data fetch
- [x] `src/components/budget/budget-view-tabs.tsx` — Track/Plan tab switcher
- [x] `src/components/budget/period-selector.tsx` — Month picker with prev/next and This Month/Last Month presets
- [x] `src/components/budget/budget-summary-card.tsx` — Income-driven summary (5 metrics: Expected Income, Total Budgeted, Left to Assign, Total Spent, Left to Spend), inline income editing
- [x] `src/components/budget/budget-track-view.tsx` — Track mode layout (Server Component)
- [x] `src/components/budget/budget-group-section.tsx` — Group section wrapper (Server Component)
- [x] `src/components/budget/budget-category-row.tsx` — Budgeted row (progress bar, inline edit) + Unbudgeted row (dashed border, Set budget)
- [x] 3-tier progress bar colors: green (<80%), amber (80-99%), red (>=100%)
- [x] Empty states: "No budgets yet" (no income, no groups), "No category spending" (income set, no groups)

## Plan Mode UI (DONE)
- [x] `src/components/budget/budget-plan-view.tsx` — Server Component data fetcher
- [x] `src/components/budget/budget-plan-view-client.tsx` — Client Component with 12-month table
- [x] Year selector with prev/next navigation
- [x] Income Target row — editable per month
- [x] Category rows grouped by group name — editable cells showing budgeted + spent (past months)
- [x] Bulk actions: "Fill from spending" (per-category and all-categories), "Apply current to future"
- [x] `roundAmount()` helper on all client input handlers (T3 fix)

## Loading Skeleton (DONE)
- [x] `src/components/budget/budget-skeleton.tsx` — Page heading, tabs, summary card, group skeletons
- [x] `src/app/dashboard/budget/loading.tsx` — Next.js loading file

## Shared Utilities (DONE)
- [x] `getCurrentYearMonth()` and `getMonthRange()` extracted to `src/lib/utils/date.ts` (R1 fix)

## Code Review Fixes (DONE)
- [x] R1: Shared date utilities extracted
- [x] R7: Schema reuse in bulk upsert
- [x] D1: Removed unused `incomeTargetId` from `BudgetPageData`
- [x] D3: Removed useless `useCallback` with unstable deps
- [x] E1/E2: `try/finally` on all client save handlers
- [x] E4/T5: URL search param validation in `page.tsx`
- [x] B3: Spending suggestions divide by actual months with data
- [x] B7: Wrapped `TrackModeContent` in `Suspense`
- [x] C1: Replaced hardcoded colors with `text-primary` semantic token
- [x] C4/C5: Removed unnecessary `"use client"` from server-compatible components
- [x] T3: `roundAmount()` helper in all client input handlers
- [x] E5: `.max(500)` on bulk upsert schema

## Tests (DONE)
- [x] Zod schema tests — 30 tests covering all 6 schemas
- [x] Server action tests — 24 tests covering all 5 actions (auth, validation, CRUD, error paths)
- [x] pgTAP database tests — 46 tests covering RLS (owner CRUD, cross-user denial, anon denial), constraints (CHECK, FK, UNIQUE), triggers (set_updated_at)
- [x] Component tests — 49 tests across 6 files:
  - `budget-track-view.test.tsx` — 9 tests (empty state, summary, groups, categories, progress bars, icons)
  - `budget-category-row.test.tsx` — 12 tests (budgeted row rendering, progress bar colors, edit mode, unbudgeted row)
  - `budget-plan-view-client.test.tsx` — 11 tests (year selector, month headers, income row, categories, groups, fill button)
  - `period-selector.test.tsx` — 9 tests (month label, navigation, presets, year boundary wrapping)
  - `budget-summary-card.test.tsx` — 6 tests (metrics, income display, edit mode, destructive color)
  - `budget-skeleton.test.tsx` — 2 tests (render, skeleton elements)
- [x] All existing tests still pass (BudgetOverview: 9 tests, dashboard: all green)

## Test Summary
- **Phase 2D-ii tests added**: 103 new Vitest tests (30 schema + 24 action + 49 component), 46 pgTAP tests
- **Cumulative Vitest total**: 555 tests (up from 452)
- **Cumulative pgTAP total**: 252 tests (up from 206)

## Files Created
- `supabase/migrations/20260304000019_budget_system.sql` — DB migration
- `supabase/tests/05_budget_system.sql` — pgTAP tests
- `src/lib/validations/budget.ts` — Zod schemas
- `src/lib/validations/__tests__/budget.test.ts` — Schema tests
- `src/lib/types/budget.ts` — Type definitions
- `src/lib/queries/budget.ts` — Query functions
- `src/app/dashboard/budget/actions.ts` — Server actions
- `src/app/dashboard/budget/__tests__/actions.test.ts` — Action tests
- `src/app/dashboard/budget/loading.tsx` — Loading skeleton wrapper
- `src/components/budget/period-selector.tsx` — Month picker
- `src/components/budget/budget-summary-card.tsx` — Summary card
- `src/components/budget/budget-category-row.tsx` — Category row components
- `src/components/budget/budget-group-section.tsx` — Group section
- `src/components/budget/budget-track-view.tsx` — Track mode layout
- `src/components/budget/budget-view-tabs.tsx` — Track/Plan tabs
- `src/components/budget/budget-plan-view.tsx` — Plan mode server wrapper
- `src/components/budget/budget-plan-view-client.tsx` — Plan mode client UI
- `src/components/budget/budget-skeleton.tsx` — Loading skeleton
- `src/components/budget/__tests__/budget-track-view.test.tsx` — Track view tests
- `src/components/budget/__tests__/budget-category-row.test.tsx` — Category row tests
- `src/components/budget/__tests__/budget-plan-view-client.test.tsx` — Plan view tests
- `src/components/budget/__tests__/period-selector.test.tsx` — Period selector tests
- `src/components/budget/__tests__/budget-summary-card.test.tsx` — Summary card tests
- `src/components/budget/__tests__/budget-skeleton.test.tsx` — Skeleton tests

## Files Modified
- `src/lib/supabase/database.types.ts` — Added `category_budgets` and `monthly_income_targets` table types
- `src/lib/queries/dashboard.ts` — Unstubbed `fetchBudgetCategories()`
- `src/lib/utils/date.ts` — Added `getCurrentYearMonth()` and `getMonthRange()`
- `src/app/dashboard/budget/page.tsx` — Replaced placeholder with full Track/Plan page
