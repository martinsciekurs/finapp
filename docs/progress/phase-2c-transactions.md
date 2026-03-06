# Phase 2C: Transactions — Progress

## Item 15: Transaction Schemas
- [x] `createTransactionSchema` — category_id (uuid), amount (positive), type (expense/income), description (max 500), date, source (web/telegram/voice), ai_generated
- [x] `updateTransactionSchema` — partial of create fields without defaults
- [x] `transactionFormSchema` — form-only subset (excludes source, ai_generated) for react-hook-form compatibility
- [x] Type exports: `CreateTransactionValues`, `UpdateTransactionValues`, `TransactionFormValues`

## Item 16: Inline Add Form
- [x] `TransactionForm` — react-hook-form + Zod resolver, expense/income type toggle (`role="radiogroup"`)
- [x] 4-field responsive grid: amount, category (filtered by type), description, date (defaults today)
- [x] Category select resets on type toggle
- [x] Submit calls `createTransaction` server action, success toast + form reset (preserves type/date)
- [x] Loading state with disabled submit + spinner

## Item 17: Transaction List
- [x] `TransactionList` — client-side filter tabs (All/Expense/Income), groups by date
- [x] `TransactionRow` — category icon, description, signed/colored amount, hover-reveal delete button
- [x] Delete via `deleteTransaction` server action with toast feedback
- [x] Delete button visible on hover/focus, always visible on touch (`@media(pointer:coarse)`)

## Item 18: Empty States + Loading
- [x] Empty state: no transactions ("Add your first transaction")
- [x] Empty state: no matching filter ("Try changing the filter")
- [x] `TransactionsSkeleton` — form skeleton + list skeleton (2 date groups, 3 rows each)
- [x] `loading.tsx` uses `TransactionsSkeleton`

## Item 19: Tests
- [x] `transaction-form.test.tsx` — 13 tests (fields, type toggle, validation, category filtering, submit, toasts, form reset, disabled state)
- [x] `transaction-list.test.tsx` — 16 tests (descriptions, amounts, date grouping, filters, empty states, delete, toasts, EUR)
- [x] `actions.test.ts` — 18 tests (create: 7 tests, update: 6 tests, delete: 5 tests — auth, validation, type mismatch, DB errors)

## Supporting Code
- [x] `src/lib/queries/transactions.ts` — `fetchTransactions`, `fetchUserCategories`, `fetchTransactionPageCurrency`
- [x] `src/lib/types/transactions.ts` — `TransactionData`, `CategoryOption`, `TransactionTypeFilter`
- [x] `src/app/dashboard/transactions/actions.ts` — 3 server actions (create/update/delete)
- [x] `src/app/dashboard/transactions/page.tsx` — Server Component with parallel data fetching

## Deferred
- [ ] Pagination / infinite scroll on the transaction list
- [ ] Search / date-range filtering (only type filter tabs exist)

## Test Summary
- **Phase 2C tests**: 47 tests across 3 files
- **Cumulative Vitest total**: 294 tests
