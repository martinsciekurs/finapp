# Phase 2F: Debts — Progress

## Item 28: Debt List + Add Debt Form (DONE)
- [x] `/dashboard/debts` replaced placeholder with full page implementation
- [x] Server query layer: `fetchDebtsPageData()` in `src/lib/queries/debts.ts`
- [x] Page data model: summary + active sections (`i_owe`, `they_owe`) + settled debts
- [x] Add debt dialog with Zod validation (`createDebtSchema`)

## Item 29: Log Payment + Linked Transaction + Auto-Settle (DONE)
- [x] Server action `recordDebtPayment` in `src/app/dashboard/debts/actions.ts`
- [x] Validates debt ownership and prevents overpayment
- [x] Creates linked transaction automatically:
  - [x] `i_owe` -> expense transaction (`Payment to {counterparty}`)
  - [x] `they_owe` -> income transaction (`Repayment from {counterparty}`)
- [x] Inserts payment row in `debt_payments`
- [x] Rollback logic: if payment insert fails, linked transaction is deleted
- [x] Auto-settlement supported by existing DB trigger (`remaining_amount` reaches 0)

## Item 30: Debt Summary Totals (DONE)
- [x] Summary cards on debts page:
  - [x] You owe
  - [x] You're owed
  - [x] Net

## Item 31: Empty State + Loading Skeleton (DONE)
- [x] Empty state for users with no debts
- [x] Route-level loading state (`src/app/dashboard/debts/loading.tsx`)
- [x] `DebtsSkeleton` component (`src/components/debts/debts-skeleton.tsx`)

## Item 32: Tests (DONE)
- [x] Zod schema tests already present/extended for debt creation + debt payments
- [x] Server action tests: `src/app/dashboard/debts/__tests__/actions.test.ts`
- [x] Component tests: `src/components/debts/__tests__/debts-view.test.tsx`
- [x] E2E debt lifecycle: `e2e/debts.spec.ts`

## Test Summary
- Vitest: 41 debt-related tests passing (19 schema + 17 actions + 5 component)
- Playwright: debt lifecycle spec passing on desktop and mobile projects
- Lint: clean
- Build: clean production build

## Files Added
- `src/lib/types/debt.ts`
- `src/lib/queries/debts.ts`
- `src/app/dashboard/debts/actions.ts`
- `src/components/debts/debts-view.tsx`
- `src/components/debts/debts-skeleton.tsx`
- `src/app/dashboard/debts/loading.tsx`
- `src/app/dashboard/debts/__tests__/actions.test.ts`
- `src/components/debts/__tests__/debts-view.test.tsx`
- `e2e/debts.spec.ts`

## Files Updated
- `src/app/dashboard/debts/page.tsx`
- `src/lib/validations/debt.ts`
