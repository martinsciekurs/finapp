# Feature Improvements, Search & Tags, and Codebase Polish

## TL;DR

> **Quick Summary**: Implement 3 features (budget plan spent toggle, transaction search/filter/category-filter, transaction tags with separate table) plus comprehensive codebase polish (UX gaps, DB security fixes, missing loading states). TDD approach throughout.
> 
> **Deliverables**:
> - Budget plan view: toggleable spent amounts (OFF by default)
> - Transaction search bar + category filter + date filter (presets + custom range)
> - Transaction tags: `tags` + `transaction_tags` tables, tag pills in UI, tag input in forms
> - Missing loading.tsx skeletons for auth/onboarding/settings routes
> - DB security fixes: numeric precision, stripe_customer_id uniqueness, missing indexes
> - Inline delete button spinner fixes
> 
> **Estimated Effort**: Large
> **Parallel Execution**: YES — 4 waves
> **Critical Path**: Task 1 (DB fixes) → Task 5 (Tags schema) → Task 7 (Tags UI) → Task 8 (Tags in forms) → Task 10 (Search/filter)

---

## Context

### Original Request
User requested three feature improvements:
1. Budget plan view: make spent amounts toggleable (disabled by default for cleaner look)
2. Transaction search (description, category, amount) + filtering (date, category)
3. Transaction tags (simple, small, subtle)

Plus a general codebase review: fix small issues, add missing smooth UX/UI (micro-animations, loading states, skeletons), check security (especially DB constraints), edit SQL files directly since not deployed.

### Interview Summary
**Key Discussions**:
- Tags implementation: User chose **separate tags table** over simple text[] array
- Date filtering: User chose **both** quick presets AND custom date range picker
- Additional filters: User wants **category filter** dropdown alongside search
- Test strategy: **TDD** — write failing tests first, then implement

**Research Findings**:
- Budget plan view (`budget-plan-view-client.tsx:155-159`): spent amounts render inline in `EditableCell` for past months — simple conditional to toggle
- Transaction list (`transaction-list.tsx:239-242`): only has client-side type filter — no search/category/date filtering
- All transactions already fetched via `fetchTransactions()` with no pagination — client-side search is viable
- 32 SQL migrations, all editable directly (not deployed)
- Dialog animations already exist (Radix CSS fade+zoom) — phantom issue eliminated by Metis
- Staggered list animations already exist on most lists — only 2 inline delete buttons actually need spinners
- `category_budgets.category_id` index is redundant — UNIQUE constraint `(category_id, year_month)` already covers it

### Metis Review
**Identified Gaps** (addressed):
- Tag limits needed: Applied defaults (5 per transaction, 50 per user, preset color palette)
- Amount search semantics unclear: Applied string-contains matching on formatted amount
- Filter state persistence: Applied local state (ephemeral, matches current pattern)
- Dialog animations flagged as missing: Verified already exist via Radix CSS — removed from scope
- Staggered animations flagged as missing: Verified most already exist — narrowed to specific delete button spinners
- `category_budgets.category_id` index flagged as missing: Verified UNIQUE constraint covers it — removed from scope
- Tag+search coupling risk: Explicitly deferred tag-based filtering to v2

---

## Work Objectives

### Core Objective
Add three features (budget spent toggle, transaction search/filter, transaction tags) and polish the codebase (security fixes, missing loading states, UX gaps) using TDD.

### Concrete Deliverables
- Modified `budget-plan-view-client.tsx` with spent toggle button + conditional rendering
- New search bar, category filter, and date filter components in `src/components/transactions/`
- New `tags` and `transaction_tags` DB tables with RLS + pgTAP tests
- New `src/lib/validations/tag.ts` Zod schemas
- New server actions for tag CRUD in `src/app/dashboard/transactions/actions.ts`
- New tag pill component + tag input component
- Updated transaction form + edit dialog with tag support
- 5 new `loading.tsx` files for auth/onboarding/settings routes
- Updated SQL migrations for numeric precision + stripe uniqueness + indexes
- Updated inline delete buttons with spinner feedback

### Definition of Done
- [ ] `npm run build` succeeds with zero errors
- [ ] `npx tsc --noEmit` reports zero type errors
- [ ] `npm test -- --run` all tests pass (including new TDD tests)
- [ ] `supabase test db` all pgTAP tests pass (including new tag/security tests)
- [ ] `npm run lint` passes

### Must Have
- Budget plan view spent toggle — OFF by default, single global boolean
- Transaction search matching description, category name, and amount
- Category filter dropdown on transactions page
- Date filter with quick presets (This Month, Last Month, Last 3 Months, This Year, All Time) + custom date range
- Tags table with RLS policies scoped by user_id
- Tag pills on transaction rows — small, subtle, non-intrusive
- Tag input in transaction form and edit dialog with autocomplete
- All new code has TDD tests (failing test → implementation → passing test)
- Missing loading.tsx skeletons for auth/onboarding/settings routes
- DB: All monetary columns standardized to `numeric(12,2)`
- DB: Partial unique index on `profiles.stripe_customer_id WHERE NOT NULL`
- DB: Missing indexes on `reminder_payments.reminder_id`
- Inline delete buttons show spinner while deleting

### Must NOT Have (Guardrails)
- **Tags**: No standalone tag management page/settings section — tags created inline only
- **Tags**: No tag-based filtering in search (deferred to v2)
- **Tags**: No tag statistics, analytics, "most used tags" features
- **Tags**: No tags on Telegram/voice/AI transactions (web source only for now)
- **Tags**: No free-form color picker — preset palette only (≤12 colors)
- **Tags**: No tags on dashboard recent-transactions widget (transactions page only)
- **Search**: No server-side search or pagination
- **Search**: No saved filters, bookmarkable views, or filter presets
- **Search**: No bulk operations (multi-select, bulk delete, bulk tag)
- **Search**: No export/download of filtered results
- **Search**: No sorting options (keep existing date desc sort)
- **Budget toggle**: No data fetching, calculations, or API calls — display only
- **Budget toggle**: No localStorage/DB persistence — ephemeral useState
- **Budget toggle**: No per-category or per-month granularity — one global boolean
- **Budget toggle**: No changes to income or summary rows
- **Polish**: No modifying shadcn/ui primitives (dialog.tsx, etc.)
- **Polish**: No creating shared animation constants files
- **Polish**: No adding animations to components that don't already have them (beyond specific listed items)
- **DB**: No auditing tables/columns not explicitly listed
- **DB**: No adding RLS to telegram_sessions (different subsystem, out of scope)
- **DB**: No renaming existing constraints for consistency
- **DB**: No adding redundant category_budgets.category_id index (UNIQUE covers it)

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Vitest + pgTAP + Playwright)
- **Automated tests**: TDD — failing test first, then implementation
- **Framework**: Vitest for unit/component tests, pgTAP for DB tests
- **Each task**: RED (failing test) → GREEN (minimal implementation) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright (playwright skill) — Navigate, interact, assert DOM, screenshot
- **TUI/CLI**: Use interactive_bash (tmux) — Run command, send keystrokes, validate output
- **API/Backend**: Use Bash (curl) — Send requests, assert status + response fields
- **Library/Module**: Use Bash (bun/node REPL) — Import, call functions, compare output

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — foundation):
├── Task 1: DB security fixes (edit existing migrations) [quick]
├── Task 2: Budget plan view spent toggle (TDD) [quick]
├── Task 3: Missing loading.tsx skeletons [quick]
└── Task 4: Inline delete button spinners [quick]

Wave 2 (After Task 1 — tags schema + search):
├── Task 5: Tags DB schema + migration + pgTAP tests [unspecified-high]
├── Task 6: Tag Zod schemas + TypeScript types [quick]
├── Task 9: Transaction search bar component (TDD) [unspecified-high]
└── Task 10: Date filter component (TDD) [visual-engineering]

Wave 3 (After Tasks 5, 6 — tags UI + filter integration):
├── Task 7: Tag server actions + query integration [unspecified-high]
├── Task 8: Tag pill component + tag input component (TDD) [visual-engineering]
├── Task 11: Category filter component (TDD) [quick]
└── Task 12: Filter bar integration into transaction list [unspecified-high]

Wave 4 (After Wave 3 — tags in forms + final integration):
├── Task 13: Tags in transaction form + edit dialog [unspecified-high]
├── Task 14: Tags display in transaction list rows [visual-engineering]
└── Task 15: Regenerate Supabase types + full build verification [quick]

Wave FINAL (After ALL tasks — independent review, 4 parallel):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 5 → Task 7 → Task 13 → Task 15 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 4 (Waves 1 & 2)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5, 6, 15 | 1 |
| 2 | — | — | 1 |
| 3 | — | — | 1 |
| 4 | — | — | 1 |
| 5 | 1 | 7, 8 | 2 |
| 6 | 1 | 7, 8, 13 | 2 |
| 7 | 5, 6 | 13, 14 | 3 |
| 8 | 5, 6 | 13, 14 | 3 |
| 9 | — | 12 | 2 |
| 10 | — | 12 | 2 |
| 11 | — | 12 | 3 |
| 12 | 9, 10, 11 | — | 3 |
| 13 | 7, 8 | 15 | 4 |
| 14 | 7, 8 | 15 | 4 |
| 15 | 13, 14 | F1-F4 | 4 |

### Agent Dispatch Summary

- **Wave 1**: **4** — T1→`quick`, T2→`quick`, T3→`quick`, T4→`quick`
- **Wave 2**: **4** — T5→`unspecified-high`, T6→`quick`, T9→`unspecified-high`, T10→`visual-engineering`
- **Wave 3**: **4** — T7→`unspecified-high`, T8→`visual-engineering`, T11→`quick`, T12→`unspecified-high`
- **Wave 4**: **3** — T13→`unspecified-high`, T14→`visual-engineering`, T15→`quick`
- **FINAL**: **4** — F1→`oracle`, F2→`unspecified-high`, F3→`unspecified-high`, F4→`deep`

---

## TODOs

- [ ] 1. DB Security Fixes — Edit Existing Migrations

  **What to do**:
  - **RED**: Write pgTAP tests in `supabase/tests/` that verify:
    - `transactions.amount` rejects values exceeding `numeric(12,2)` precision (e.g., `99999999999.999` should fail)
    - `profiles.stripe_customer_id` rejects duplicate non-null values
    - `profiles.stripe_customer_id` allows multiple NULLs (free users)
    - `reminder_payments` queries by `reminder_id` are indexed (explain plan)
  - **GREEN**: Edit the original migration files directly (not new migrations — not deployed):
    - `20260304000006_transactions.sql` line 8: Change `amount numeric` → `amount numeric(12,2)`
    - `20260304000008_debts.sql` line 10: Change `original_amount numeric` → `original_amount numeric(12,2)`
    - `20260304000008_debts.sql` line 11: Change `remaining_amount numeric` → `remaining_amount numeric(12,2)`
    - `20260304000009_debt_payments.sql` line 8: Change `amount numeric` → `amount numeric(12,2)`
    - `20260304000002_profiles.sql`: Add partial unique index: `CREATE UNIQUE INDEX idx_profiles_stripe_customer_id ON public.profiles (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;`
    - `20260304000020_reminder_payments.sql`: Add index: `CREATE INDEX idx_reminder_payments_reminder_id ON public.reminder_payments (reminder_id);`
  - **REFACTOR**: Run `supabase db reset` to verify clean migration, then run `supabase test db` to confirm all tests pass (existing + new)
  - Also fix RPC function signatures in `20260306000023_update_debt_atomic.sql`, `20260306000024_record_debt_payment_atomic.sql`, `20260306000025_update_debt_payment_atomic.sql`, `20260306000026_delete_debt_payment_atomic.sql` to use `numeric(12,2)` for monetary params

  **Must NOT do**:
  - Do NOT add a separate index on `category_budgets.category_id` — the UNIQUE constraint `(category_id, year_month)` already provides it
  - Do NOT add RLS policies to `telegram_sessions`
  - Do NOT rename existing constraints
  - Do NOT touch tables not explicitly listed

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Simple text edits to SQL files + running test commands. No special skills needed.
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction needed
    - `git-master`: No git operations

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4)
  - **Blocks**: Tasks 5, 6, 15
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `supabase/tests/03_constraints.sql` — Existing constraint test patterns (throws_ok with errcode cast)
  - `supabase/tests/05_budget_system.sql` — Budget system test patterns for RLS and numeric constraints
  - `supabase/tests/00_helpers.sql` — Test helpers: `create_test_user()`, `authenticate_as()`, `reset_role()`

  **API/Type References**:
  - `supabase/migrations/20260304000006_transactions.sql:8` — Current `amount numeric` to change to `numeric(12,2)`
  - `supabase/migrations/20260304000008_debts.sql:10-11` — Current bare `numeric` columns
  - `supabase/migrations/20260304000009_debt_payments.sql:8` — Current bare `numeric`
  - `supabase/migrations/20260304000002_profiles.sql:13` — `stripe_customer_id text` needing unique index
  - `supabase/migrations/20260304000020_reminder_payments.sql` — Table needing `reminder_id` index
  - `supabase/migrations/20260306000023_update_debt_atomic.sql:7,20-21` — RPC params needing precision
  - `supabase/migrations/20260306000024_record_debt_payment_atomic.sql:3` — RPC params needing precision
  - `supabase/migrations/20260306000025_update_debt_payment_atomic.sql:3` — RPC params needing precision
  - `supabase/migrations/20260306000026_delete_debt_payment_atomic.sql` — RPC params needing precision

  **WHY Each Reference Matters**:
  - `03_constraints.sql`: Shows the `throws_ok(sql, errcode::char(5), null, description)` pattern needed for constraint error tests
  - `05_budget_system.sql`: Shows how to test numeric(12,2) constraints — same pattern needed for transactions/debts
  - `00_helpers.sql`: Provides `create_test_user()` helper needed to set up test data for constraint tests

  **Acceptance Criteria**:

  **TDD:**
  - [ ] New pgTAP test file created (e.g., `supabase/tests/08_db_security.sql`) with tests for numeric precision, stripe uniqueness, and indexes
  - [ ] `supabase test db` → PASS (all existing + new tests, 0 failures)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Numeric precision enforcement on transactions
    Tool: Bash
    Preconditions: supabase db reset completed successfully
    Steps:
      1. Run: supabase test db 2>&1
      2. Check output for test "transactions amount rejects excess precision"
      3. Verify the test passes (proves numeric(12,2) is enforced)
    Expected Result: All tests pass, including new numeric precision tests
    Failure Indicators: "not ok" lines in test output, migration errors during db reset
    Evidence: .sisyphus/evidence/task-1-numeric-precision.txt

  Scenario: Stripe customer ID uniqueness enforcement
    Tool: Bash
    Preconditions: supabase db reset completed successfully
    Steps:
      1. Run: supabase test db 2>&1
      2. Check output for test "stripe_customer_id rejects duplicates"
      3. Verify the test passes (proves unique constraint works)
      4. Also verify test "stripe_customer_id allows multiple NULLs" passes
    Expected Result: Both tests pass
    Failure Indicators: "not ok" lines, unique violation on NULLs (would mean partial index is wrong)
    Evidence: .sisyphus/evidence/task-1-stripe-uniqueness.txt
  ```

  **Commit**: YES
  - Message: `fix(db): standardize numeric precision and add security constraints`
  - Files: `supabase/migrations/*.sql`, `supabase/tests/08_db_security.sql`
  - Pre-commit: `supabase test db`

---

- [ ] 2. Budget Plan View — Spent Amounts Toggle (TDD)

  **What to do**:
  - **RED**: Write Vitest test for `BudgetPlanViewClient` that:
    - Verifies spent amounts are NOT visible by default
    - Verifies toggling the "Show spent" button makes spent amounts visible
    - Verifies toggling back hides them again
  - **GREEN**: Implement in `src/components/budget/budget-plan-view-client.tsx`:
    - Add `const [showSpent, setShowSpent] = useState(false)` to `BudgetPlanViewClient`
    - Add a small toggle button in the toolbar (next to YearSelector and "Fill from spending"): label "Show spent", uses `Eye`/`EyeOff` icon from lucide-react
    - Pass `showSpent` as prop to `EditableCell`
    - In `EditableCell` (lines 155-159): change `{isPast && spent > 0 && (` to `{showSpent && isPast && spent > 0 && (`
  - **REFACTOR**: Ensure the toggle animates spent amounts in/out smoothly (Framer Motion fade, 150ms, respect prefers-reduced-motion)

  **Must NOT do**:
  - Do NOT persist toggle state to localStorage or URL params
  - Do NOT add per-category or per-month toggle — single global boolean
  - Do NOT change income row or summary rows behavior
  - Do NOT add any data fetching or API calls

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Small UI change — one state variable, one button, one conditional. No external knowledge needed.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Too small for design consultation
    - `playwright`: Vitest test sufficient for this component

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/components/budget/budget-plan-view-client.tsx:89-91` — Current `showSpent` equivalent: `const [editing, setEditing] = useState(false)` pattern to follow for toggle state
  - `src/components/budget/budget-plan-view-client.tsx:146-161` — EditableCell render logic, specifically lines 155-159 where spent is rendered
  - `src/components/budget/budget-plan-view-client.tsx:458-471` — Toolbar area where toggle button should be placed

  **API/Type References**:
  - `src/components/budget/budget-plan-view-client.tsx:74-88` — EditableCell props interface — `spent` and `isPast` props already exist

  **Test References**:
  - `src/components/budget/__tests__/budget-plan-view-client.test.tsx` — Existing test file for this component — follow same patterns

  **External References**:
  - `lucide-react`: `Eye` and `EyeOff` icons for toggle button

  **WHY Each Reference Matters**:
  - Lines 155-159: This is the EXACT code to modify — wrapping in `showSpent &&` condition
  - Lines 458-471: This is the toolbar where the toggle button goes — need to maintain flex layout
  - Existing test file: Follow same render + mock patterns for consistency

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file updated: `src/components/budget/__tests__/budget-plan-view-client.test.tsx`
  - [ ] `npm test -- --run src/components/budget/__tests__/budget-plan-view-client.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Spent amounts hidden by default
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with budget data for past months
    Steps:
      1. Navigate to /dashboard/budget?view=plan
      2. Wait for plan table to render (selector: `table`)
      3. Query for spent amount text elements within EditableCell (selector: `.text-muted-foreground` inside `td`)
      4. Assert: spent amount sub-text is NOT visible in past month cells
    Expected Result: Only budgeted amounts visible, no spent amounts shown
    Failure Indicators: Spent amounts visible below budgeted amounts in past months
    Evidence: .sisyphus/evidence/task-2-spent-hidden-default.png

  Scenario: Toggle shows/hides spent amounts
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with budget data for past months
    Steps:
      1. Navigate to /dashboard/budget?view=plan
      2. Click the "Show spent" toggle button (selector: button containing Eye icon)
      3. Assert: spent amounts now visible in past month cells
      4. Click toggle again (now "Hide spent")
      5. Assert: spent amounts hidden again
    Expected Result: Toggle switches visibility of spent amounts on/off
    Failure Indicators: Amounts don't appear/disappear, toggle button not found
    Evidence: .sisyphus/evidence/task-2-spent-toggle.png
  ```

  **Commit**: YES
  - Message: `feat(budget): add spent amounts toggle to plan view`
  - Files: `src/components/budget/budget-plan-view-client.tsx`, `src/components/budget/__tests__/budget-plan-view-client.test.tsx`
  - Pre-commit: `npm test -- --run src/components/budget`

---

- [ ] 3. Missing Loading Skeletons for Auth/Onboarding/Settings

  **What to do**:
  - Create `loading.tsx` files for routes that are missing them:
    - `src/app/auth/loading.tsx` — Skeleton matching auth page layout (logo + card with form fields)
    - `src/app/onboarding/loading.tsx` — Skeleton matching onboarding wizard (step indicator + content area)
    - `src/app/dashboard/settings/loading.tsx` — Skeleton matching settings page layout
    - `src/app/dashboard/settings/profile/loading.tsx` — Skeleton matching profile form
  - Each skeleton should use the existing `Skeleton` component from `src/components/ui/skeleton.tsx`
  - Match the actual page layout structure (reference the page.tsx for each route)
  - Add `animate-pulse` to skeleton containers for shimmer effect

  **Must NOT do**:
  - Do NOT modify existing loading.tsx files
  - Do NOT modify shadcn/ui skeleton.tsx component
  - Do NOT add Framer Motion animations to skeletons (use CSS animate-pulse for consistency with existing skeletons)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Creating simple skeleton layout files. No complex logic.
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: Skeletons are structural copies of existing layouts, not design work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 4)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/app/dashboard/transactions/loading.tsx` — Existing loading skeleton pattern to follow
  - `src/app/dashboard/debts/loading.tsx` — Another skeleton pattern reference
  - `src/components/dashboard/shell-skeleton.tsx` — Shell skeleton showing how to mock layout structure
  - `src/components/ui/skeleton.tsx` — Base Skeleton component to use

  **API/Type References**:
  - `src/app/auth/auth-page.tsx` — Auth page layout structure to match (logo + tabs + form card)
  - `src/app/onboarding/onboarding-wizard.tsx` — Wizard layout structure to match
  - `src/app/dashboard/settings/page.tsx` — Settings page layout to match
  - `src/app/dashboard/settings/profile/page.tsx` — Profile form layout to match

  **WHY Each Reference Matters**:
  - Existing loading.tsx files: Copy the export pattern and Skeleton usage approach
  - Page files: Must match the actual rendered layout so skeleton-to-content transition is smooth

  **Acceptance Criteria**:

  - [ ] Files created: `src/app/auth/loading.tsx`, `src/app/onboarding/loading.tsx`, `src/app/dashboard/settings/loading.tsx`, `src/app/dashboard/settings/profile/loading.tsx`
  - [ ] `npm run build` → succeeds (files are valid React components)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auth loading skeleton renders
    Tool: Bash
    Preconditions: Dev server running
    Steps:
      1. Run: npm run build 2>&1
      2. Verify no build errors
      3. Check file exists: ls src/app/auth/loading.tsx
    Expected Result: Build succeeds, file exists
    Failure Indicators: Build error, file missing
    Evidence: .sisyphus/evidence/task-3-loading-skeletons-build.txt

  Scenario: Loading skeletons match page layouts
    Tool: Playwright (playwright skill)
    Preconditions: Clean browser, app running
    Steps:
      1. Throttle network to Slow 3G
      2. Navigate to /auth/login
      3. Screenshot during loading phase (before content appears)
      4. Verify skeleton elements are visible (Skeleton components rendering)
    Expected Result: Skeleton layout visible during loading, roughly matches page structure
    Failure Indicators: Blank page during loading, no skeleton visible
    Evidence: .sisyphus/evidence/task-3-auth-skeleton.png
  ```

  **Commit**: YES (groups with Task 4)
  - Message: `fix(ux): add missing loading skeletons and delete button spinners`
  - Files: `src/app/auth/loading.tsx`, `src/app/onboarding/loading.tsx`, `src/app/dashboard/settings/loading.tsx`, `src/app/dashboard/settings/profile/loading.tsx`
  - Pre-commit: `npm run build`

---

- [ ] 4. Inline Delete Button Spinners

  **What to do**:
  - **RED**: Write/update Vitest tests for `TransactionList` and `ReminderList` that:
    - Verify delete button shows `Loader2` spinner while deleting
    - Verify delete button is disabled while deleting
  - **GREEN**: Fix inline delete buttons that show `isDeleting` state but lack visual spinner:
    - `src/components/transactions/transaction-list.tsx` lines 174-182: Add `Loader2` spinner when `isDeleting` is true (replace `Trash2` icon conditionally)
    - `src/components/reminders/reminder-list.tsx`: Find equivalent inline delete button, add same pattern
  - **REFACTOR**: Ensure spinner uses same `animate-spin` class as other Loader2 usages in codebase

  **Must NOT do**:
  - Do NOT change delete behavior or logic
  - Do NOT add animations beyond the spinner
  - Do NOT modify dialog-based delete buttons (they already have spinners)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Simple icon swap on two buttons. Minimal change.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2, 3)
  - **Blocks**: None
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/components/transactions/transaction-form.tsx:212-219` — Existing `Loader2` spinner pattern: `{isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}`
  - `src/components/reminders/delete-reminder-dialog.tsx` — Dialog delete button with spinner for reference pattern

  **API/Type References**:
  - `src/components/transactions/transaction-list.tsx:77-78` — `isDeleting` state already exists
  - `src/components/transactions/transaction-list.tsx:174-182` — Exact lines to modify for delete button

  **Test References**:
  - `src/components/transactions/__tests__/transaction-list.test.tsx` — Existing test file to update
  - `src/components/reminders/__tests__/reminder-list.test.tsx` — Existing test file to update

  **WHY Each Reference Matters**:
  - `transaction-form.tsx:212-219`: This is the EXACT pattern to copy — conditional icon swap on isSubmitting/isDeleting
  - `transaction-list.tsx:77-78`: Confirms `isDeleting` state exists and is set correctly, just needs visual feedback

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Tests updated in `src/components/transactions/__tests__/transaction-list.test.tsx`
  - [ ] Tests updated in `src/components/reminders/__tests__/reminder-list.test.tsx`
  - [ ] `npm test -- --run` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Transaction delete button shows spinner
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with at least one transaction
    Steps:
      1. Navigate to /dashboard/transactions
      2. Hover over a transaction row to reveal action buttons
      3. Click the delete button (selector: `button[aria-label="Delete transaction"]`)
      4. Assert: Loader2 spinner visible in button (selector: `.animate-spin` within delete button)
      5. Assert: Button is disabled during deletion
    Expected Result: Spinner visible during delete, button disabled
    Failure Indicators: Trash2 icon stays static during delete, button clickable while processing
    Evidence: .sisyphus/evidence/task-4-delete-spinner.png

  Scenario: Delete completes and spinner disappears
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with at least one transaction
    Steps:
      1. Navigate to /dashboard/transactions
      2. Click delete on a transaction
      3. Wait for toast notification (selector: `[data-sonner-toast]`)
      4. Assert: Toast says "Transaction deleted"
      5. Assert: Transaction removed from list
    Expected Result: Clean delete flow with feedback
    Failure Indicators: No toast, transaction still visible, error toast
    Evidence: .sisyphus/evidence/task-4-delete-complete.png
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `fix(ux): add missing loading skeletons and delete button spinners`
  - Files: `src/components/transactions/transaction-list.tsx`, `src/components/reminders/reminder-list.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 5. Tags Database Schema + Migration + pgTAP Tests

  **What to do**:
  - **RED**: Write pgTAP tests FIRST in `supabase/tests/09_tags.sql`:
    - RLS: Owner can CRUD own tags, cannot see other user's tags, anon gets nothing
    - RLS: Owner can CRUD own transaction_tags, cannot see other user's assignments
    - Constraints: Tag name max 30 chars, tag name not empty, color format valid
    - Uniqueness: `(user_id, lower(btrim(name)))` — case-insensitive per user
    - FK: Deleting a tag cascades to transaction_tags
    - FK: Deleting a transaction cascades to transaction_tags
    - Limit: Max 5 tags per transaction (CHECK or trigger)
    - Limit: Max 50 tags per user (CHECK or trigger — use application-level enforcement via server action)
  - **GREEN**: Create new migration file `supabase/migrations/20260306000031_tags.sql`:
    ```sql
    -- Tags table
    CREATE TABLE public.tags (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
      name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 30),
      color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    -- Case-insensitive unique per user
    CREATE UNIQUE INDEX idx_tags_user_name ON public.tags (user_id, lower(btrim(name)));
    -- Updated_at trigger
    CREATE TRIGGER set_tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    -- RLS
    ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
    CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);
    -- Index for lookups
    CREATE INDEX idx_tags_user_id ON public.tags (user_id);

    -- Transaction-Tag junction
    CREATE TABLE public.transaction_tags (
      transaction_id UUID NOT NULL,
      tag_id UUID NOT NULL,
      user_id UUID NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id, user_id) REFERENCES public.transactions (id, user_id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES public.tags (id) ON DELETE CASCADE
    );
    -- RLS
    ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can view own transaction_tags" ON public.transaction_tags FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own transaction_tags" ON public.transaction_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can delete own transaction_tags" ON public.transaction_tags FOR DELETE USING (auth.uid() = user_id);
    -- Indexes
    CREATE INDEX idx_transaction_tags_tag_id ON public.transaction_tags (tag_id);
    CREATE INDEX idx_transaction_tags_user_id ON public.transaction_tags (user_id);
    ```
  - **REFACTOR**: Run `supabase db reset` → `supabase test db` to verify everything passes

  **Must NOT do**:
  - Do NOT add an UPDATE policy on transaction_tags (assignments are add/remove only, no updates)
  - Do NOT add a tags management page or settings section
  - Do NOT implement tag limit enforcement at DB level for per-user limit (do it in server action) — only per-transaction limit via trigger or application logic

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - Reason: Requires careful SQL schema design with RLS, composite FKs, and pgTAP test writing. More complex than `quick`.
  - **Skills Evaluated but Omitted**:
    - `playwright`: No browser interaction

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 6, 9, 10)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Task 1 (DB fixes must be done first)

  **References**:

  **Pattern References**:
  - `supabase/migrations/20260304000006_transactions.sql` — Transaction table pattern (RLS, indexes, composite FK, triggers)
  - `supabase/migrations/20260304000005_categories.sql` — Categories pattern with case-insensitive unique: reference for tag name uniqueness
  - `supabase/tests/01_rls_policies.sql` — RLS test patterns (authenticate_as, cross-user denial, anon denial)
  - `supabase/tests/03_constraints.sql` — Constraint test patterns (throws_ok, errcode cast)

  **API/Type References**:
  - `supabase/migrations/20260304000006_transactions.sql:59-61` — `uq_transactions_id_user (id, user_id)` constraint that the junction table's composite FK references

  **WHY Each Reference Matters**:
  - `transactions.sql`: Shows the composite FK + unique constraint pattern needed for junction table
  - `categories.sql`: Shows case-insensitive unique index pattern to copy for tag names
  - `01_rls_policies.sql`: Follow exact test structure: create users, authenticate_as, verify access/denial

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created: `supabase/tests/09_tags.sql` with RLS + constraint tests
  - [ ] `supabase test db` → PASS (all tests including new tag tests)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tags migration runs cleanly
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: supabase db reset 2>&1
      2. Check output for migration errors
    Expected Result: Clean reset with no errors, tags and transaction_tags tables created
    Failure Indicators: Migration error referencing tags table, FK constraint errors
    Evidence: .sisyphus/evidence/task-5-migration-clean.txt

  Scenario: Tag RLS isolates user data
    Tool: Bash
    Preconditions: supabase db reset completed
    Steps:
      1. Run: supabase test db 2>&1
      2. Check for "Users can only see own tags" test
      3. Check for "Cross-user tag access denied" test
      4. Verify all tag RLS tests pass
    Expected Result: All RLS tests pass, user isolation confirmed
    Failure Indicators: "not ok" on any RLS test
    Evidence: .sisyphus/evidence/task-5-tag-rls.txt
  ```

  **Commit**: YES (groups with Task 6)
  - Message: `feat(tags): add tags schema, types, and validation`
  - Files: `supabase/migrations/20260306000031_tags.sql`, `supabase/tests/09_tags.sql`
  - Pre-commit: `supabase test db`

---

- [ ] 6. Tag Zod Schemas + TypeScript Types

  **What to do**:
  - Create `src/lib/validations/tag.ts`:
    - `createTagSchema`: `{ name: string (1-30 chars, trimmed), color: string (hex #RRGGBB) }`
    - `updateTagSchema`: partial of above
    - `assignTagSchema`: `{ transactionId: UUID, tagId: UUID }`
    - `removeTagSchema`: same as assign
    - Export inferred types
  - Create/update `src/lib/types/tags.ts`:
    - `TagData`: `{ id: string, name: string, color: string }`
    - `TransactionTagData`: `{ transactionId: string, tagId: string }`
  - Update `src/lib/types/transactions.ts`:
    - Add `tags: TagData[]` to `TransactionData` interface
  - Define the preset color palette as a constant (12 colors matching the app's design system):
    - `TAG_COLORS` array in `src/lib/config/tags.ts` or `src/lib/validations/tag.ts`

  **Must NOT do**:
  - Do NOT create types for tag management page (doesn't exist)
  - Do NOT add tag filtering types (deferred to v2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Creating type definitions and Zod schemas — straightforward, follows existing patterns.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 9, 10)
  - **Blocks**: Tasks 7, 8, 13
  - **Blocked By**: Task 1 (types depend on stable schema)

  **References**:

  **Pattern References**:
  - `src/lib/validations/transaction.ts` — Existing Zod schema patterns (enum, uuid, string constraints)
  - `src/lib/types/transactions.ts` — TransactionData interface to extend with `tags`
  - `src/lib/types/attachments.ts` — Similar data type pattern for related entities

  **API/Type References**:
  - `src/lib/validations/transaction.ts:6-14` — `createTransactionSchema` as pattern for `createTagSchema`
  - `src/lib/types/transactions.ts:14-25` — `TransactionData` interface to add `tags: TagData[]`

  **WHY Each Reference Matters**:
  - `transaction.ts` validation: Copy the same Zod patterns (z.string().uuid(), z.string().max())
  - `TransactionData`: This is the interface that needs `tags` field — used everywhere transactions are displayed

  **Acceptance Criteria**:

  - [ ] Files created: `src/lib/validations/tag.ts`, `src/lib/types/tags.ts`
  - [ ] File updated: `src/lib/types/transactions.ts` with `tags: TagData[]`
  - [ ] `npx tsc --noEmit` → zero type errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Type definitions compile
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: npx tsc --noEmit 2>&1
      2. Check for zero errors
    Expected Result: Clean compilation
    Failure Indicators: Type errors referencing tags types
    Evidence: .sisyphus/evidence/task-6-types-compile.txt

  Scenario: Zod schema validates correctly
    Tool: Bash
    Preconditions: None
    Steps:
      1. Run: npx tsc --noEmit 2>&1 (ensures schemas are importable)
      2. Verify createTagSchema exists and exports correctly
    Expected Result: No import/export errors
    Failure Indicators: Module resolution errors
    Evidence: .sisyphus/evidence/task-6-zod-validation.txt
  ```

  **Commit**: YES (groups with Task 5)
  - Message: `feat(tags): add tags schema, types, and validation`
  - Files: `src/lib/validations/tag.ts`, `src/lib/types/tags.ts`, `src/lib/types/transactions.ts`
  - Pre-commit: `npx tsc --noEmit`

---

- [ ] 7. Tag Server Actions + Query Integration

  **What to do**:
  - **RED**: Write Vitest tests for tag server actions:
    - `createTag` returns `{ success: true, data: { id } }` on valid input
    - `createTag` rejects empty name, invalid color, duplicate name (case-insensitive)
    - `createTag` rejects when user has 50+ tags
    - `deleteTag` removes tag and cascades to transaction_tags
    - `assignTagToTransaction` adds a tag assignment
    - `removeTagFromTransaction` removes a tag assignment
    - `assignTagToTransaction` rejects when transaction already has 5 tags
  - **GREEN**: Add server actions to `src/app/dashboard/transactions/actions.ts` (or new `src/app/dashboard/transactions/tag-actions.ts`):
    - `createTag(values)` — validate with Zod, check user tag count (≤50), insert, revalidate
    - `deleteTag(id)` — delete tag (CASCADE handles junction), revalidate
    - `assignTagToTransaction(transactionId, tagId)` — verify both belong to user, check 5-tag limit, insert junction row, revalidate
    - `removeTagFromTransaction(transactionId, tagId)` — delete junction row, revalidate
  - Update `src/lib/queries/transactions.ts`:
    - Modify `fetchTransactions()` to also fetch tags per transaction via junction table join
    - Add `fetchUserTags()` query function returning all tags for current user (for autocomplete)
  - **REFACTOR**: Ensure all actions follow existing `ActionResult` pattern

  **Must NOT do**:
  - Do NOT add `updateTag` action (tag renaming/recoloring is v2)
  - Do NOT add tag filtering or tag-based search
  - Do NOT add bulk tag operations

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - Reason: Complex server action logic with multiple queries, validation, and limit enforcement.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 11, 12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `src/app/dashboard/transactions/actions.ts:17-83` — `createTransaction` pattern: validate → verify ownership → insert → revalidate
  - `src/app/dashboard/transactions/actions.ts:89-172` — `updateTransaction` pattern: validate → fetch current → verify → update → revalidate
  - `src/lib/queries/transactions.ts:40-73` — `fetchTransactions()` query to modify for tag joining

  **API/Type References**:
  - `src/lib/types/actions.ts` — `ActionResult` type for server action return values
  - `src/lib/validations/tag.ts` — Zod schemas from Task 6
  - `src/lib/types/tags.ts` — `TagData` type from Task 6
  - `src/lib/queries/attachments.ts` — `fetchAttachmentsByRecordIds()` pattern for batch-loading related data

  **Test References**:
  - `src/app/dashboard/transactions/__tests__/actions.test.ts` — Existing server action test patterns

  **WHY Each Reference Matters**:
  - `createTransaction` action: Copy the exact auth check → validate → verify ownership → insert → revalidate flow
  - `fetchTransactions()`: Must be modified to also fetch tags — follow the `fetchAttachmentsByRecordIds` pattern for batch loading
  - `ActionResult`: All new actions must return this type for consistency

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created/updated for tag actions
  - [ ] `npm test -- --run` → PASS (all tag action tests)

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create tag successfully
    Tool: Bash
    Preconditions: npm test setup
    Steps:
      1. Run: npm test -- --run src/app/dashboard/transactions 2>&1
      2. Check for "createTag" test results
    Expected Result: All createTag tests pass (valid creation, duplicate rejection, limit enforcement)
    Failure Indicators: Test failures on tag creation tests
    Evidence: .sisyphus/evidence/task-7-tag-actions.txt

  Scenario: fetchTransactions includes tags
    Tool: Bash
    Preconditions: npm test setup
    Steps:
      1. Run: npx tsc --noEmit 2>&1
      2. Verify TransactionData now includes tags field and all usages compile
    Expected Result: No type errors — tags field properly threaded through
    Failure Indicators: Type errors where TransactionData is used without tags
    Evidence: .sisyphus/evidence/task-7-fetch-tags.txt
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `feat(tags): add server actions and UI components`
  - Files: `src/app/dashboard/transactions/tag-actions.ts`, `src/lib/queries/transactions.ts`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 8. Tag Pill Component + Tag Input Component (TDD)

  **What to do**:
  - **RED**: Write Vitest tests for:
    - `TagPill` component: renders tag name with correct background color, small size, correct text
    - `TagInput` component: renders input, shows dropdown with matching tags on type, allows selecting existing tag, allows creating new tag, shows color palette for new tags, respects 5-tag limit
  - **GREEN**: Create components:
    - `src/components/transactions/tag-pill.tsx`: Small pill/badge showing tag name with tinted background color. Use `motion.span` with fade animation. Respect prefers-reduced-motion. Very small — `text-[11px]`, subtle, non-intrusive.
    - `src/components/transactions/tag-input.tsx`: Combobox-style input (follow `CategoryCombobox` pattern) that:
      - Shows existing user tags as options (filtered by search)
      - Allows creating a new tag inline (name + color from preset palette)
      - Shows selected tags as `TagPill` elements
      - Removes tag on pill click/x
      - Enforces max 5 tags visually (disables input at limit)
  - **REFACTOR**: Ensure consistent styling with app's design system

  **Must NOT do**:
  - Do NOT build a color picker — use preset palette only
  - Do NOT add drag-and-drop tag reordering
  - Do NOT add tag editing (rename/recolor) from this component

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Tag pills need careful visual design — must be "very small and subtle without disturbing the overall view" per user requirement. Color handling, sizing, and visual subtlety are key.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Ensures tag pills are visually refined and match the design system

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 11, 12)
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 5, 6

  **References**:

  **Pattern References**:
  - `src/components/transactions/category-combobox.tsx` — Combobox pattern to follow for TagInput (Command + Popover from shadcn/ui)
  - `src/components/categories/color-picker.tsx` — Color picker pattern for preset palette selection
  - `src/components/transactions/transaction-list.tsx:129-136` — Transaction row layout where pills will eventually appear

  **API/Type References**:
  - `src/lib/types/tags.ts` — `TagData` type with `{ id, name, color }`
  - `src/components/ui/command.tsx` — shadcn/ui Command component for searchable dropdown
  - `src/components/ui/popover.tsx` — shadcn/ui Popover for dropdown positioning

  **Test References**:
  - `src/components/transactions/__tests__/category-combobox.test.tsx` — Combobox test patterns to follow

  **WHY Each Reference Matters**:
  - `category-combobox.tsx`: This is the EXACT pattern to replicate — shadcn Command + Popover with grouped items and search
  - `color-picker.tsx`: Shows how to render a color palette grid for selection
  - Transaction row layout: Shows where tag pills will go — must be small enough to not disrupt this layout

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test files created: `src/components/transactions/__tests__/tag-pill.test.tsx`, `src/components/transactions/__tests__/tag-input.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/tag-` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TagPill renders correctly with color
    Tool: Bash
    Preconditions: npm test setup
    Steps:
      1. Run: npm test -- --run src/components/transactions/__tests__/tag-pill.test.tsx 2>&1
      2. Verify all tests pass
    Expected Result: TagPill renders with correct name, color tint, small size
    Failure Indicators: Test failures on rendering or styling assertions
    Evidence: .sisyphus/evidence/task-8-tag-pill.txt

  Scenario: TagInput autocomplete works
    Tool: Bash
    Preconditions: npm test setup
    Steps:
      1. Run: npm test -- --run src/components/transactions/__tests__/tag-input.test.tsx 2>&1
      2. Verify tests for: type to filter, select existing, create new, 5-tag limit
    Expected Result: All tag input interaction tests pass
    Failure Indicators: Test failures on interaction tests
    Evidence: .sisyphus/evidence/task-8-tag-input.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(tags): add server actions and UI components`
  - Files: `src/components/transactions/tag-pill.tsx`, `src/components/transactions/tag-input.tsx`, test files
  - Pre-commit: `npm test -- --run src/components/transactions`

---

- [ ] 9. Transaction Search Bar Component (TDD)

  **What to do**:
  - **RED**: Write Vitest tests for a `TransactionSearchBar` component:
    - Renders search input with placeholder "Search transactions..."
    - Calls onChange callback with debounced value (300ms)
    - Shows clear button (X) when search has value
    - Clears search on X click
    - Matches description text (case-insensitive substring)
    - Matches category name (case-insensitive substring)
    - Matches amount (contains digits, e.g., "50" matches "$50.00" and "$150.00")
  - **GREEN**: Create `src/components/transactions/transaction-search-bar.tsx`:
    - Input with `Search` icon (lucide-react), debounced onChange
    - Export a pure filter function `filterTransactions(transactions, query)` that applies text matching logic
    - Match logic: split query into terms, each term must match at least one of (description, categoryName, formatted amount)
  - **REFACTOR**: Ensure search input styling matches existing Input component

  **Must NOT do**:
  - Do NOT implement server-side search
  - Do NOT add sorting/ordering controls
  - Do NOT add tag-based search (deferred to v2)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Search matching logic requires careful implementation — multi-field matching, debouncing, edge cases.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 10)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/transactions/transaction-list.tsx:239-242` — Existing client-side filter pattern to extend
  - `src/components/transactions/category-combobox.tsx` — shadcn Command component uses similar search/filter pattern
  - `src/lib/utils/currency.ts` — `formatCurrency()` function to use for amount matching

  **API/Type References**:
  - `src/lib/types/transactions.ts:14-25` — `TransactionData` fields to search against: `description`, `categoryName`, `amount`

  **WHY Each Reference Matters**:
  - `transaction-list.tsx:239-242`: This is where the filter result feeds into `groupByDate()` — new search filter goes before this
  - `formatCurrency()`: Used for amount display — search should match against formatted amounts for user-visible consistency

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created: `src/components/transactions/__tests__/transaction-search-bar.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/transaction-search-bar.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Search filters by description
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with transactions including "Coffee shop" and "Grocery store"
    Steps:
      1. Navigate to /dashboard/transactions
      2. Type "coffee" into search bar (selector: `input[placeholder*="Search"]`)
      3. Wait 400ms for debounce
      4. Assert: Only transactions with "coffee" in description are visible
      5. Assert: "Grocery store" transaction is NOT visible
    Expected Result: List filtered to matching transactions
    Failure Indicators: All transactions still visible, or no transactions visible
    Evidence: .sisyphus/evidence/task-9-search-description.png

  Scenario: Search filters by amount
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with transactions of varying amounts
    Steps:
      1. Navigate to /dashboard/transactions
      2. Type "50" into search bar
      3. Wait 400ms for debounce
      4. Assert: Transactions with amounts containing "50" are visible (e.g., $50.00, $150.00)
    Expected Result: Amount-matching transactions shown
    Failure Indicators: No transactions match, or all transactions visible
    Evidence: .sisyphus/evidence/task-9-search-amount.png
  ```

  **Commit**: YES (groups with Tasks 10, 11, 12)
  - Message: `feat(transactions): add search bar, category filter, and date filter`
  - Files: `src/components/transactions/transaction-search-bar.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 10. Date Filter Component (TDD)

  **What to do**:
  - **RED**: Write Vitest tests for a `TransactionDateFilter` component:
    - Renders dropdown with presets: "All Time", "This Month", "Last Month", "Last 3 Months", "This Year", "Custom Range"
    - Selecting a preset calls onChange with { from, to } date range
    - Selecting "Custom Range" shows two date inputs (from, to)
    - Custom range validates from ≤ to
    - "All Time" passes null/undefined (no filter)
  - **GREEN**: Create `src/components/transactions/transaction-date-filter.tsx`:
    - Use shadcn/ui `Select` or `Popover` + `Button` for preset dropdown
    - For custom range: two `Input type="date"` fields inside the popover
    - Export a pure filter function `filterByDateRange(transactions, from, to)` 
    - Export preset calculation function `getDateRangeFromPreset(preset)` returning { from, to }
  - **REFACTOR**: Match styling with existing `PeriodSelector` component pattern

  **Must NOT do**:
  - Do NOT add a calendar component — use native date inputs for simplicity
  - Do NOT persist date filter to URL or localStorage

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Date filter needs thoughtful UI — presets dropdown + custom range in popover. Visual layout matters.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Ensures the filter dropdown + date inputs look polished

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 9)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/budget/period-selector.tsx` — Existing date/period UI pattern in the app
  - `src/components/ui/select.tsx` — shadcn/ui Select component for preset dropdown
  - `src/components/ui/popover.tsx` — Popover for custom range section

  **API/Type References**:
  - `src/lib/utils/date.ts` — Date formatting utilities (formatDate, formatDateForInput)
  - `src/lib/types/transactions.ts:14-25` — `TransactionData.date` is a string in `YYYY-MM-DD` format

  **WHY Each Reference Matters**:
  - `period-selector.tsx`: Shows the app's existing date navigation pattern — follow similar visual style
  - `date.ts`: Use existing date utilities instead of creating new ones

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created: `src/components/transactions/__tests__/transaction-date-filter.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/transaction-date-filter.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Date filter presets work
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with transactions spanning multiple months
    Steps:
      1. Navigate to /dashboard/transactions
      2. Click date filter dropdown
      3. Select "This Month"
      4. Assert: Only transactions from current month are visible
      5. Select "Last Month"
      6. Assert: Only transactions from last month are visible
    Expected Result: Presets correctly filter by date range
    Failure Indicators: All transactions visible regardless of preset, or no transactions visible
    Evidence: .sisyphus/evidence/task-10-date-presets.png

  Scenario: Custom date range works
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with transactions spanning multiple months
    Steps:
      1. Navigate to /dashboard/transactions
      2. Click date filter, select "Custom Range"
      3. Set from date to 2026-01-01 and to date to 2026-01-31
      4. Assert: Only January 2026 transactions visible
    Expected Result: Custom range correctly filters transactions
    Failure Indicators: Filter not applied, validation error on valid range
    Evidence: .sisyphus/evidence/task-10-date-custom.png
  ```

  **Commit**: YES (groups with Tasks 9, 11, 12)
  - Message: `feat(transactions): add search bar, category filter, and date filter`
  - Files: `src/components/transactions/transaction-date-filter.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 11. Category Filter Component (TDD)

  **What to do**:
  - **RED**: Write Vitest tests for a `TransactionCategoryFilter` component:
    - Renders "All Categories" by default
    - Shows dropdown with grouped categories (matching CategoryCombobox grouping)
    - Selecting a category calls onChange with categoryId
    - "All Categories" option clears the filter
    - Shows category icon + name in dropdown options
  - **GREEN**: Create `src/components/transactions/transaction-category-filter.tsx`:
    - Use `Popover` + `Command` pattern (same as `CategoryCombobox` but without form integration)
    - Accept `categories: CategoryOption[]` and `value: string | null` and `onChange: (id: string | null) => void`
    - Group by category group name
    - Export a pure filter function `filterByCategory(transactions, categoryId)`
  - **REFACTOR**: Ensure consistent look with existing combobox patterns

  **Must NOT do**:
  - Do NOT add multi-category select
  - Do NOT add tag filtering here (v2)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Very similar to existing CategoryCombobox — mostly adapting existing pattern.
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 7, 8, 12)
  - **Blocks**: Task 12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/transactions/category-combobox.tsx` — EXACT pattern to adapt (Popover + Command with groups)

  **API/Type References**:
  - `src/lib/types/transactions.ts:31-39` — `CategoryOption` type with `group_name` for grouping

  **Test References**:
  - `src/components/transactions/__tests__/category-combobox.test.tsx` — Test patterns to follow

  **WHY Each Reference Matters**:
  - `category-combobox.tsx`: This is essentially the same component but as a filter instead of form field — adapt rather than build from scratch

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Test file created: `src/components/transactions/__tests__/transaction-category-filter.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/transaction-category-filter.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Category filter shows grouped categories
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with categorized transactions
    Steps:
      1. Navigate to /dashboard/transactions
      2. Click category filter button
      3. Assert: Dropdown shows categories grouped by group name
      4. Select a specific category (e.g., "Groceries")
      5. Assert: Only transactions in that category are visible
    Expected Result: Category filter works, groups display correctly
    Failure Indicators: No groups in dropdown, filter doesn't apply
    Evidence: .sisyphus/evidence/task-11-category-filter.png
  ```

  **Commit**: YES (groups with Tasks 9, 10, 12)
  - Message: `feat(transactions): add search bar, category filter, and date filter`
  - Files: `src/components/transactions/transaction-category-filter.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 12. Filter Bar Integration into Transaction List

  **What to do**:
  - **RED**: Write/update Vitest tests for `TransactionList`:
    - Renders search bar, category filter, date filter alongside existing type filter
    - Search + type + category + date filters combine with AND logic
    - "Clear all filters" button appears when any filter is active
    - Result count shows when filters reduce the list (e.g., "5 of 42 transactions")
    - Empty state shows "No matching transactions" with clear filter button
  - **GREEN**: Update `src/components/transactions/transaction-list.tsx`:
    - Add state variables: `searchQuery`, `selectedCategoryId`, `dateRange { from, to }`
    - Import and render `TransactionSearchBar`, `TransactionCategoryFilter`, `TransactionDateFilter`
    - Create a filter bar layout: search bar full-width on top, type tabs + category filter + date filter in a row below
    - Apply all filters in sequence: type → category → date → search (pipe through filter functions)
    - Add result count display
    - Add "Clear all" button
  - **REFACTOR**: Ensure filter bar is responsive (stacks on mobile)

  **Must NOT do**:
  - Do NOT change existing type filter behavior
  - Do NOT add URL persistence for filters
  - Do NOT add sorting controls

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Integration task touching many components, needs careful layout + state management.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Filter bar layout needs to look clean and be responsive

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Tasks 9, 10, 11)
  - **Parallel Group**: Wave 3 (after Tasks 9, 10, 11 complete)
  - **Blocks**: None
  - **Blocked By**: Tasks 9, 10, 11

  **References**:

  **Pattern References**:
  - `src/components/transactions/transaction-list.tsx:217-316` — Current TransactionList component to modify
  - `src/components/transactions/transaction-list.tsx:239-244` — Current filter logic to extend with new filters
  - `src/components/budget/budget-view-tabs.tsx` — Tab/filter UI pattern in the app

  **API/Type References**:
  - All filter components from Tasks 9, 10, 11

  **Test References**:
  - `src/components/transactions/__tests__/transaction-list.test.tsx` — Existing tests to update (must not break)

  **WHY Each Reference Matters**:
  - `transaction-list.tsx:239-244`: This is where new filters chain into the existing pipeline — must preserve the type filter and add new ones
  - Existing tests: Must continue to pass with new filter bar added

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Tests updated in `src/components/transactions/__tests__/transaction-list.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/transaction-list.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Combined filters work with AND logic
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with diverse transactions
    Steps:
      1. Navigate to /dashboard/transactions
      2. Select type filter: "expense"
      3. Select category filter: "Groceries"
      4. Type "store" in search
      5. Assert: Only expense transactions in Groceries category with "store" in description are visible
      6. Assert: Result count shows "N of M transactions"
    Expected Result: All filters combine correctly
    Failure Indicators: Filters don't stack, wrong transactions shown
    Evidence: .sisyphus/evidence/task-12-combined-filters.png

  Scenario: Clear all filters resets everything
    Tool: Playwright (playwright skill)
    Preconditions: Multiple filters active
    Steps:
      1. With filters active from previous scenario
      2. Click "Clear all" button
      3. Assert: All transactions visible again
      4. Assert: Search bar empty, type shows "all", category shows "All Categories", date shows "All Time"
    Expected Result: All filters reset to defaults
    Failure Indicators: Some filters persist, not all transactions shown
    Evidence: .sisyphus/evidence/task-12-clear-filters.png
  ```

  **Commit**: YES (groups with Tasks 9, 10, 11)
  - Message: `feat(transactions): add search bar, category filter, and date filter`
  - Files: `src/components/transactions/transaction-list.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 13. Tags in Transaction Form + Edit Dialog

  **What to do**:
  - **RED**: Write/update Vitest tests for:
    - `TransactionForm` renders TagInput component
    - Creating a transaction with tags sends tag assignments
    - `EditTransactionDialog` shows existing tags and allows editing
    - Saving edited transaction updates tag assignments
  - **GREEN**:
    - Update `src/components/transactions/transaction-form.tsx`:
      - Add `tags` state (separate from react-hook-form since tags aren't part of transaction schema)
      - Render `TagInput` component as a full-width row below the grid
      - After successful `createTransaction`, call `assignTagToTransaction` for each selected tag
    - Update `src/components/transactions/edit-transaction-dialog.tsx`:
      - Load current tags from `transaction.tags`
      - Render `TagInput` with pre-selected tags
      - On save: diff old vs new tags, call assign/remove actions for changes
    - Update `src/app/dashboard/transactions/page.tsx`:
      - Fetch user tags via `fetchUserTags()` and pass to form components
  - **REFACTOR**: Ensure tag operations don't block form submission (use startTransition for tag assignments after transaction is created/updated)

  **Must NOT do**:
  - Do NOT add tags to the transaction Zod schema (they're managed separately via junction table)
  - Do NOT add tag creation to the transaction server action (tags are created via separate action)
  - Do NOT add tags to Telegram/voice transaction sources

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex integration — modifying two existing form components, managing tag state alongside form state, handling async tag assignments.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Tag input placement needs visual polish within existing form layouts

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 14)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - `src/components/transactions/transaction-form.tsx:108-224` — Current form layout to extend
  - `src/components/transactions/edit-transaction-dialog.tsx:65-234` — Current edit dialog to extend
  - `src/components/transactions/transaction-form.tsx:68-99` — `onSubmit` handler pattern to follow for post-create tag assignment

  **API/Type References**:
  - `src/app/dashboard/transactions/tag-actions.ts` — Tag server actions from Task 7
  - `src/lib/queries/transactions.ts` — `fetchUserTags()` from Task 7
  - `src/components/transactions/tag-input.tsx` — TagInput component from Task 8

  **WHY Each Reference Matters**:
  - `transaction-form.tsx:68-99`: Shows the onSubmit flow — tag assignments go AFTER successful createTransaction
  - `edit-transaction-dialog.tsx:65-234`: Shows how form state is managed — tags need parallel state management

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Tests updated in `src/components/transactions/__tests__/transaction-form.test.tsx`
  - [ ] Tests updated in `src/components/transactions/__tests__/edit-transaction-dialog.test.tsx` (create if needed)
  - [ ] `npm test -- --run src/components/transactions` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Create transaction with tags
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with existing tags
    Steps:
      1. Navigate to /dashboard/transactions
      2. Fill transaction form (amount: 25.00, category: Groceries, description: "Weekly shop")
      3. Click tag input area
      4. Select two existing tags from dropdown
      5. Submit form
      6. Assert: Toast "Expense added"
      7. Assert: New transaction visible in list with tag pills
    Expected Result: Transaction created with tags, pills visible
    Failure Indicators: Tags not assigned, pills not showing
    Evidence: .sisyphus/evidence/task-13-create-with-tags.png

  Scenario: Edit transaction tags
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with a tagged transaction
    Steps:
      1. Navigate to /dashboard/transactions
      2. Click edit on a tagged transaction
      3. Assert: Edit dialog shows existing tags in TagInput
      4. Remove one tag (click X on pill)
      5. Add a new tag
      6. Click Save
      7. Assert: Toast "Transaction updated"
      8. Assert: Updated tags visible on transaction row
    Expected Result: Tags updated correctly
    Failure Indicators: Tags not persisted, old tags still showing
    Evidence: .sisyphus/evidence/task-13-edit-tags.png
  ```

  **Commit**: YES (groups with Task 14)
  - Message: `feat(transactions): integrate tags into forms and list display`
  - Files: `src/components/transactions/transaction-form.tsx`, `src/components/transactions/edit-transaction-dialog.tsx`, `src/app/dashboard/transactions/page.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 14. Tags Display in Transaction List Rows

  **What to do**:
  - **RED**: Write/update Vitest tests for `TransactionRow`:
    - Renders tag pills when transaction has tags
    - Does NOT render tag section when transaction has no tags
    - Tag pills show correct name and color
    - Tag pills are small and subtle (text-[11px] or similar)
  - **GREEN**: Update `src/components/transactions/transaction-list.tsx`:
    - In `TransactionRow` component, add tag pills below the description line (inside the `min-w-0 flex-1` div)
    - Render `TagPill` for each tag in `transaction.tags`
    - Use flex-wrap with small gap for multiple tags
    - Only render if `transaction.tags.length > 0`
  - **REFACTOR**: Animate tag pills with subtle fade-in (Framer Motion, respect prefers-reduced-motion)

  **Must NOT do**:
  - Do NOT add click-to-filter-by-tag on pills (v2)
  - Do NOT show tags in expanded/detail view only — show in collapsed row
  - Do NOT show tags on dashboard recent-transactions widget

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Tag display must be "very small and subtle without disturbing the overall view" — this is a visual design task.
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Critical for achieving the subtle, non-intrusive pill design

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Task 13)
  - **Blocks**: Task 15
  - **Blocked By**: Tasks 7, 8

  **References**:

  **Pattern References**:
  - `src/components/transactions/transaction-list.tsx:98-211` — TransactionRow component to modify
  - `src/components/transactions/transaction-list.tsx:129-136` — Description + category area where pills go below

  **API/Type References**:
  - `src/components/transactions/tag-pill.tsx` — TagPill component from Task 8
  - `src/lib/types/transactions.ts` — TransactionData with `tags: TagData[]`

  **WHY Each Reference Matters**:
  - `transaction-list.tsx:129-136`: Tags go as a new line within this `min-w-0 flex-1` div — below category name, must not push row height too much

  **Acceptance Criteria**:

  **TDD:**
  - [ ] Tests updated in `src/components/transactions/__tests__/transaction-list.test.tsx`
  - [ ] `npm test -- --run src/components/transactions/__tests__/transaction-list.test.tsx` → PASS

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Tag pills appear on tagged transactions
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with tagged and untagged transactions
    Steps:
      1. Navigate to /dashboard/transactions
      2. Find a transaction with tags
      3. Assert: Small colored pills visible below category name
      4. Assert: Pill text matches tag name
      5. Assert: Pill font size is very small (≤11px)
      6. Find an untagged transaction
      7. Assert: No pill elements present
    Expected Result: Tags display subtly on tagged transactions only
    Failure Indicators: Pills too large, pills on untagged transactions, no pills on tagged transactions
    Evidence: .sisyphus/evidence/task-14-tag-pills-display.png

  Scenario: Tags don't disrupt transaction row layout
    Tool: Playwright (playwright skill)
    Preconditions: User logged in with transactions (some with many tags, some with none)
    Steps:
      1. Navigate to /dashboard/transactions
      2. Screenshot the full transaction list
      3. Compare visual alignment of amount column, icons, action buttons
      4. Assert: Row heights are consistent (tags add minimal height)
      5. Assert: Amount column stays right-aligned
    Expected Result: Clean, undisturbed layout with subtle tag additions
    Failure Indicators: Misaligned columns, excessive row height, visual clutter
    Evidence: .sisyphus/evidence/task-14-tag-layout-clean.png
  ```

  **Commit**: YES (groups with Task 13)
  - Message: `feat(transactions): integrate tags into forms and list display`
  - Files: `src/components/transactions/transaction-list.tsx`, test files
  - Pre-commit: `npm test -- --run`

---

- [ ] 15. Regenerate Supabase Types + Full Build Verification

  **What to do**:
  - Run `supabase gen types typescript --local > src/lib/types/database.types.ts` to regenerate types from updated schema (tags tables + precision changes)
  - Run `npx tsc --noEmit` to verify all TypeScript compiles
  - Run `npm run build` to verify production build succeeds
  - Run `npm test -- --run` to verify all tests pass
  - Run `supabase test db` to verify all pgTAP tests pass
  - Run `npm run lint` to verify no lint errors
  - Fix any issues found

  **Must NOT do**:
  - Do NOT manually edit generated types file
  - Do NOT skip any verification command

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []
    - Reason: Running commands and fixing any small issues that surface.

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (after ALL Wave 4 tasks)
  - **Blocks**: Final Verification Wave
  - **Blocked By**: Tasks 13, 14

  **References**:

  **Pattern References**:
  - `src/lib/types/database.types.ts` — File to regenerate (if it exists)
  - `AGENTS.md` — Convention: "After schema changes: regenerate types with `supabase gen types typescript`"

  **Acceptance Criteria**:

  - [ ] `supabase gen types typescript` → types regenerated
  - [ ] `npx tsc --noEmit` → 0 errors
  - [ ] `npm run build` → succeeds
  - [ ] `npm test -- --run` → all tests pass
  - [ ] `supabase test db` → all tests pass
  - [ ] `npm run lint` → no errors

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full build verification
    Tool: Bash
    Preconditions: All previous tasks completed
    Steps:
      1. Run: supabase gen types typescript --local > src/lib/types/database.types.ts
      2. Run: npx tsc --noEmit 2>&1
      3. Run: npm run build 2>&1
      4. Run: npm test -- --run 2>&1
      5. Run: supabase test db 2>&1
      6. Run: npm run lint 2>&1
      7. Assert: All commands exit with code 0
    Expected Result: Clean build, no errors anywhere
    Failure Indicators: Any non-zero exit code, any error output
    Evidence: .sisyphus/evidence/task-15-full-verification.txt
  ```

  **Commit**: YES
  - Message: `chore: regenerate supabase types and verify build`
  - Files: `src/lib/types/database.types.ts`
  - Pre-commit: `npm run build`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npm run lint` + `npm test -- --run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify all new components respect `prefers-reduced-motion`.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`supabase db reset`). Execute EVERY QA scenario from EVERY task — follow exact steps, capture evidence. Test cross-task integration (tags + search working together, budget toggle + plan view). Test edge cases: empty state, invalid input, rapid actions, mobile viewport. Save to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff (git log/diff). Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance for ALL guardrails. Detect cross-task contamination: Task N touching Task M's files. Flag unaccounted changes. Specifically verify: no tag management page, no server-side search, no tag filtering, no dialog animation changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| After | Message | Files | Pre-commit check |
|-------|---------|-------|-----------------|
| Task 1 | `fix(db): standardize numeric precision and add security constraints` | `supabase/migrations/*.sql` | `supabase test db` |
| Task 2 | `feat(budget): add spent amounts toggle to plan view` | `src/components/budget/*` | `npm test -- --run` |
| Tasks 3+4 | `fix(ux): add missing loading skeletons and delete button spinners` | `src/app/*/loading.tsx`, `src/components/*/` | `npm test -- --run` |
| Tasks 5+6 | `feat(tags): add tags schema, types, and validation` | `supabase/migrations/*`, `src/lib/types/*`, `src/lib/validations/*` | `supabase test db` |
| Tasks 7+8 | `feat(tags): add server actions and UI components` | `src/app/dashboard/transactions/*`, `src/components/transactions/*` | `npm test -- --run` |
| Tasks 9-12 | `feat(transactions): add search bar, category filter, and date filter` | `src/components/transactions/*` | `npm test -- --run` |
| Tasks 13+14 | `feat(transactions): integrate tags into forms and list display` | `src/components/transactions/*` | `npm test -- --run` |
| Task 15 | `chore: regenerate supabase types and verify build` | `src/lib/types/database.types.ts` | `npm run build` |

---

## Success Criteria

### Verification Commands
```bash
npm run build         # Expected: Build succeeds, zero errors
npx tsc --noEmit      # Expected: Zero type errors
npm test -- --run     # Expected: All tests pass (including new TDD tests)
supabase test db      # Expected: All pgTAP tests pass (including new tag/security tests)
npm run lint          # Expected: No lint errors
```

### Final Checklist
- [ ] All "Must Have" present and verified
- [ ] All "Must NOT Have" absent (verified by scope fidelity check)
- [ ] All tests pass (unit + pgTAP)
- [ ] Build succeeds
- [ ] Types regenerated and compile
