# Draft: Feature Improvements & Codebase Polish

## Requirements (confirmed)

### Feature 1: Budget Plan View — Spent Amounts Toggle
- **What**: In the Plan view (12-month table), spent amounts are currently shown inline below budgeted amounts for past months
- **Current behavior**: `EditableCell` shows spent below budgeted for past months when `spent > 0` (line 155-159 of budget-plan-view-client.tsx)
- **Desired**: Make spent amounts toggleable. OFF by default for a cleaner look
- **User's words**: "spent amounts should be enablable/disablable. By default disabled to make it cleaner"

### Feature 2: Transaction Search & Filtering
- **What**: Add search/filter capabilities to the transactions page
- **Search fields**: description, category, amount
- **Filters**: date range, possibly others
- **Current state**: Only has type filter (all/expense/income) — client-side
- **No server-side search exists** — fetchTransactions() returns ALL user transactions

### Feature 3: Transaction Tags
- **What**: Add tags to transactions
- **Style**: "very small and subtle without disturbing the overall view"
- **Current state**: No tags concept exists in DB or codebase
- **Requires**: New DB table, migration, UI components, form integration

### Feature 4: General Codebase Polish
- **UX/UI gaps**: Missing loading states, micro-animations, skeletons
- **Security review**: DB constraints, SQL migrations (not deployed yet — can edit directly)
- **Small issues**: Anything noticed during review

## Technical Decisions

### Budget Spent Toggle
- Location: `budget-plan-view-client.tsx` — `EditableCell` component
- Approach: Add a toggle button (e.g., "Show/Hide Spent") in the toolbar area next to YearSelector
- State: Local React state, default OFF
- Pass `showSpent` prop to EditableCell → only render spent line when enabled

### Transaction Search
- Approach: Client-side search + URL-based date filter
- All transactions are already fetched (no pagination) so client-side search is viable
- Search input debounced, matches against description (text), category name (text), amount (number)
- Date filter: Could use URL searchParams for month/range

### Transaction Tags
- DB: New `transaction_tags` table with (id, user_id, name, color?)
- Junction: `transaction_tag_assignments` table (transaction_id, tag_id) or simpler: text[] array column on transactions
- Simpler approach: tags as text array on transactions table → avoids join complexity
- Display: Small pill/badge next to description or below it

## Research Findings

### Budget Plan View
- `EditableCell` at line 146-161 shows budgeted + spent (spent only for past months)
- Toolbar at lines 460-471 has YearSelector + "Fill from spending" button — good place for toggle
- `PlannerData.categories[].cells[]` already has `spent` field

### Transactions Page
- `fetchTransactions()` returns ALL transactions (no limit/pagination) with category join
- `TransactionList` has client-side type filter only
- `TransactionData` interface has: id, amount, type, description, date, categoryId, categoryName, categoryIcon, categoryColor, attachments
- `groupByDate()` groups transactions by date string

### UX Gaps (from explore agent audit)
- Missing loading.tsx: auth routes, onboarding, settings parent, settings/profile
- No dialog animations (dialogs appear/disappear abruptly)
- Skeletons exist but no shimmer/pulse animation on them
- Delete buttons in transaction list have isDeleting state but no spinner visual
- No staggered list animations (individual items animate but no stagger between items)

## Decisions Made (from interview)
- **Tags**: Separate `tags` table (id, user_id, name, color) + `transaction_tags` junction table
- **Transaction search**: Client-side (all data already fetched, no pagination)
- **Date filter**: Both quick presets AND custom date range picker
- **Additional filters**: Category filter dropdown
- **Test strategy**: TDD — write failing tests first, then implement
- **Budget spent toggle**: Plan view only (user specified "budgets page -> plan")

## Security Audit Findings (from explore agent)

### CRITICAL
1. **Missing unique constraint on stripe_customer_id** — profiles table; multiple users could share Stripe customer
2. **Numeric precision inconsistency** — transactions/debts use bare `numeric`, budgets/reminders use `numeric(12,2)`. Standardize all monetary fields to `numeric(12,2)`
3. **Missing index on category_budgets.category_id** — FK lookup will cause sequential scan

### IMPORTANT  
4. Missing index on reminder_payments.reminder_id
5. Race condition potential in debt_payments trigger under concurrent load
6. Missing explicit deny INSERT policy on profiles (currently silent fail)
7. Missing explicit deny DELETE policy on daily_usage
8. No test coverage for budget system constraints (year_month format, amount>0, composite FK)

### MINOR
9. btrim() vs trim() inconsistency
10. Inconsistent trigger naming conventions
11. Missing SECURITY DEFINER documentation
12. Missing test for polymorphic FK validation in attachments

## UX Gaps Found (from explore agent)

### Missing Loading States
- /auth/login, /auth/sign-up — no loading.tsx
- /onboarding — no loading.tsx  
- /dashboard/settings (parent) — no loading.tsx
- /dashboard/settings/profile — no loading.tsx

### Missing Animations
- Dialog components (all) — no entrance/exit animations
- Landing page — no animations
- Transaction list — has item animation but no stagger between date groups

### Other
- Delete buttons show isDeleting state but no spinner visual
- Skeletons have no shimmer/pulse animation
- useOptimistic/useTransition underutilized

## Scope Boundaries
- INCLUDE: All 4 features listed above
- INCLUDE: UX polish (loading states, animations, skeletons)
- INCLUDE: Security/DB constraint review and fixes (SQL editable since not deployed)
- EXCLUDE: New page routes or major architecture changes
- EXCLUDE: Pagination (not mentioned, would be a separate concern)
