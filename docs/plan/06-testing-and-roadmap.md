# Testing & Roadmap

## Testing Strategy

Aim for high confidence in core flows without over-testing implementation details. Tests should catch regressions, not mirror the code.

### Unit Tests (Vitest + React Testing Library)

| What to test                  | Examples                                              |
| ----------------------------- | ----------------------------------------------------- |
| Zod validation schemas        | Transaction schema rejects negative amounts, missing fields, invalid type. AI input rejects >100 words. Debt payment can't exceed remaining. |
| Utility functions             | Date formatting, currency formatting, budget calculations. |
| Component behavior            | `TransactionForm` submits correct data, `AiSuggestChip` calls accept/dismiss callbacks, `BannerPicker` emits selection, `DebtCard` shows correct remaining. |
| Hooks                         | Custom hooks for data fetching, debouncing, feature gating logic. |

### Integration Tests (Vitest)

| What to test                  | Examples                                              |
| ----------------------------- | ----------------------------------------------------- |
| Server Actions                | Transaction CRUD (expense + income), debt CRUD, debt payment recording (remaining_amount reaches 0 = settled) + linked transaction creation. |
| API routes                    | AI suggest endpoint returns valid structured output. AI rejects >100 word input. Stripe webhook updates subscription. Cron reminder logic respects notification preferences. |
| Auth middleware               | Unauthenticated requests redirect to login. Admin routes reject non-admins. Onboarding redirect for new users. |

### End-to-End Tests (Playwright)

Critical user flows only - these are the most expensive to maintain:

| Flow                          | What it covers                                        |
| ----------------------------- | ----------------------------------------------------- |
| Auth + onboarding flow        | Sign up -> auto-login -> onboarding wizard (categories, banner) -> dashboard. |
| Add transaction               | Type in inline form -> submit -> appears in list. Test both expense and income types. |
| AI suggest flow               | Type natural language -> see suggestion chip -> accept -> form fills. Verify correct type detection. |
| Budget management             | Create category -> set budget -> see progress bar.    |
| Debt lifecycle                | Add debt -> log payment -> see progress -> settle.    |
| Banner change                 | Click "Change cover" -> pick preset -> banner updates.|
| Stripe upgrade                | Click upgrade -> Stripe checkout (test mode) -> tier updates. |
| Account deletion              | Settings -> Delete Account -> confirm -> account removed. |

### Database Tests (pgTAP)

| What to test                  | Examples                                              |
| ----------------------------- | ----------------------------------------------------- |
| RLS policies                  | Owner CRUD on all 12 tables, cross-user denial, anon lockout, missing policy enforcement (no DELETE on profiles/subscriptions/daily_usage). |
| Triggers & functions          | `set_updated_at`, `handle_new_user`, `is_admin`, `update_debt_remaining_on_change` (overpayment guard), `daily_usage_update_guard`, `notifications_update_guard`, `attachments_parent_check/cleanup`, `append_onboarding_step`. |
| FK constraints                | Composite FK enforcement (type mismatch, cross-user), ON DELETE behavior (RESTRICT, CASCADE, SET NULL). |
| CHECK & UNIQUE constraints    | Amount > 0, enum values, counterparty non-empty, remaining_amount bounds, duplicate category names. |

### Test Infrastructure
- `vitest.config.ts` with path aliases matching `tsconfig.json`.
- pgTAP enabled via migration. Test helpers in `supabase/tests/00_helpers.sql` provide `create_test_user()`, `authenticate_as()`, `reset_role()`, and factory functions (`create_test_category_group`, `create_test_category`, etc.).
- Supabase test helpers: factory functions for creating test users, expenses, categories, debts (using Supabase's local dev stack or mocked client).
- Playwright config: run against local dev server. Use Supabase local instance for E2E.
- CI: Run unit tests + pgTAP database tests + lint on every PR. E2E tests on PRs targeting main.

### Coverage Targets
- Unit/Integration: 80%+ coverage on `lib/` and `components/` directories.
- E2E: All 8 critical flows listed above must pass.
- No coverage requirement on layout/page files (thin wrappers).

---

## Implementation Roadmap

> **Progress tracking**: See [`docs/progress/`](../progress/) for completed phase checklists.

### Phase 1: Foundation
1. Project scaffolding: Next.js 16, Tailwind, shadcn/ui, Framer Motion, Zod, Vitest + Playwright setup
2. PWA configuration: manifest, service worker, app icons
3. Global styling: Light + dark palettes as CSS custom properties (HSL), typography, shadcn theme, `next-themes` setup. All using semantic tokens.
4. Database: Execute all Supabase migrations (UUIDv7, timestamps convention, all tables), verify RLS policies
5. Auth: Supabase middleware (route protection table), login/signup pages (no email confirmation), Supabase config `enable_confirmations = false`
6. Onboarding wizard: Expense category selection, banner pick, auto-create income categories
7. Tests: Auth + onboarding E2E, middleware integration tests

### Phase 2A: Dashboard Shell & Layout
8. Responsive dashboard shell: Hero banner (with default), bottom nav (mobile) + sidebar nav (desktop), notification bell placeholder
9. Loading skeletons for the shell (nav, banner, content area)
10. Tests: Shell renders correctly at mobile/desktop breakpoints, nav links work

### Phase 2B: Dashboard Overview
11. Summary cards with animated counters (Total Spent, Total Income, Net Balance)
12. Budget overview chart (placeholder data OK until budget feature lands)
13. Empty state for overview when no data exists
14. Tests: Summary card unit tests, counter animation tests

### Phase 2C: Transactions
15. Transaction Zod schemas + validation tests
16. Inline add form with type toggle (expense/income) and Zod validation
17. Transaction list view (grouped by date, filterable by type)
18. Empty state + loading skeleton for transactions
19. Tests: Transaction CRUD E2E (expense + income), form component unit tests, schema unit tests

### Phase 2D-i: Category Management

**Design**: Categories are organized into user-managed groups. Every category must belong to a group (`group_id NOT NULL`). `type` stays on categories as a denormalized field (needed for composite FKs from transactions + unique constraints + direct filtering). Budget data lives in a separate `category_budgets` table (Phase 2D-ii), not on categories.

**Database**:
- New `category_groups` table: `id`, `user_id`, `name`, `type` (expense/income), `sort_order`. Constraints: `UNIQUE(id, user_id)` for composite FK, `UNIQUE(user_id, type, name)`. RLS: `auth.uid() = user_id`.
- Altered `categories`: added `group_id uuid NOT NULL` with composite FK `(group_id, user_id) → category_groups(id, user_id)`. Dropped `budget_limit`. Added `check_category_group_type` trigger ensuring category type matches group type.

**Onboarding**: Backend only (no UI change). `completeOnboarding` creates default expense groups ("Essentials", "Lifestyle", "Health & Growth", "Financial", "Other") + "Income" group, then assigns `group_id` to categories via lookup.

**Settings > Categories page** (`/dashboard/settings/categories`):
- Tab toggle: Expense | Income. Groups in sort_order, each containing its categories.
- Category CRUD: Add/edit dialog (name, icon picker, color picker, group dropdown). Delete with reassign if transactions exist.
- Group CRUD: Add/rename/delete (reassign categories if non-empty). Reorder via sort_order.
- Components: `CategoryManager`, `CategoryGroupSection`, `CategoryRow`, `AddCategoryDialog`, `EditCategoryDialog`, `DeleteCategoryDialog`, `AddGroupDialog`, `EditGroupDialog`, `DeleteGroupDialog`, `IconPicker`, `ColorPicker`.

**Server Actions** (`/dashboard/settings/categories/actions.ts`): `createCategory`, `updateCategory`, `deleteCategory`, `createGroup`, `updateGroup`, `deleteGroup`, `reorderCategories`, `reorderGroups`. All return `{ success, data?, error? }`.

**Zod Schemas** (`src/lib/validations/category.ts`): create/update/delete schemas for categories and groups. Name 1-50 chars, color hex regex, IDs as uuid.

**Queries** (`src/lib/queries/categories.ts`): `fetchCategoriesWithGroups(type)`, `fetchCategoryTransactionCount(id)`.

**Roadmap items**:
20. Database: `category_groups` table + `group_id` (NOT NULL) on categories + drop `budget_limit`
21. Zod schemas + server actions for category and group CRUD
22. Settings > Categories page: group sections, category rows, add/edit/delete dialogs, icon/color pickers
23. Update onboarding to auto-create default groups and assign `group_id`
24. Update dashboard code referencing removed `budget_limit`
25. Loading skeleton + empty states for categories page
26. Tests: Zod schema, component unit, server action integration, pgTAP (RLS, FKs, constraints)

### Phase 2D-ii: Budget System

**Design Philosophy**: Income-driven budgeting (YNAB-style). User sets expected monthly income, assigns budgets to expense categories, "left to assign" = income - assigned. Two modes: Track (how am I doing?) and Plan (how much do I want to spend?). Smart suggestions auto-fill from spending history.

**Database**:
- `category_budgets`: `id`, `category_id`, `user_id`, `year_month` (text, regex-checked), `amount` (positive). FK `(category_id, user_id) → categories(id, user_id)`. `UNIQUE(category_id, year_month)`.
- `monthly_income_targets`: `id`, `user_id`, `year_month`, `amount` (positive). `UNIQUE(user_id, year_month)`.
- RLS on both: `auth.uid() = user_id`.

**Track Mode** (`/dashboard/budget`):
- Period selector (presets: this month, last 3, quarter, YTD, year; custom month range via URL params).
- Income-driven summary card: expected income, spent/budgeted progress bar, left to assign, left to spend, conversational insight.
- Category cards grouped by `category_groups`: progress bars for budgeted categories, dashed border + nudge for unbudgeted. Inline edit for budget amount. Multi-month: aggregate with expandable breakdown.

**Plan Mode**:
- Year selector with Overview (table: categories x 12 months, all cells editable inline) and By Category (scrollable pills, 12-month grid, past months show actuals).
- Bulk actions: set all months, copy from year, fill from spending history, apply to remaining months.

**Smart Suggestions**: Query last 12 months of spending by category. Past months: actual spending rounded to nearest 10. Future months: 3-month average rounded up. Preview modal before applying.

**Server Actions** (`/dashboard/budget/actions.ts`): `upsertCategoryBudget`, `removeCategoryBudget`, `bulkUpsertCategoryBudgets`, `bulkUpsertAllCategoryBudgets`, `upsertIncomeTarget`, `removeIncomeTarget`, `bulkUpsertIncomeTargets`.

**Zod Schemas** (`src/lib/validations/budget.ts`): `yearMonthSchema` (regex), upsert/bulk schemas for budgets and income targets.

**Queries** (`src/lib/queries/budget.ts`): `fetchBudgetPageData(from, to)`, `fetchPlannerData(year)`, `fetchSpendingSuggestions()`, `fetchIncomeAverage()`.

**Roadmap items**:
27. Database: `category_budgets` table (per-month per-category) + `monthly_income_targets` table
28. Track mode: period selector (presets + custom month range), income-driven summary card, grouped category cards with progress bars, inline budget edit
29. Plan mode: yearly table overview (all categories x 12 months) + by-category detail view + bulk actions (set all, copy from year, fill from spending, apply to remaining)
30. Smart suggestions: auto-suggest budgets from spending history (3-month average)
31. Income target management: per-month expected income, auto-suggest from income transactions
32. Empty states + loading skeletons for budget views
33. Tests: Budget management E2E, progress bar unit tests, Zod schema tests, pgTAP

### Phase 2E: Reminders
24. Reminder list with due date display
25. "Mark as Paid" action (server action + optimistic UI)
26. Empty state + loading skeleton for reminders
27. Tests: Reminder component unit tests, server action integration tests

### Phase 2F: Debts
28. Debt list + add debt form with Zod validation
29. Log payment (with linked transaction creation) + auto-settle when remaining reaches 0
30. Debt summary totals (total owed, total lent, net)
31. Empty state + loading skeleton for debts
32. Tests: Debt lifecycle E2E (add -> pay -> settle), linked transaction creation tests, Zod schema tests

### Phase 2G: File Attachments
33. Reusable `Attachments` component (upload, preview, delete)
34. Integrate into transactions, debts, and reminders views
35. Tests: Attachment component unit tests, upload/delete integration tests

### Phase 2H: Guided Tour & Polish
36. Post-onboarding guided tour (tooltip flow across dashboard sections)
37. Audit all empty states and loading skeletons for consistency
38. Tests: Guided tour E2E (shows on first visit, dismisses correctly)

### Phase 3A: AI Foundation
39. Vercel AI SDK setup (Gemini as primary, provider-agnostic config)
40. AI input validation: 100-word limit, shared Zod schema
41. AI credits system: `daily_usage` table, unified credit check helper
42. Tests: AI input validation schema tests, credit check unit tests

### Phase 3B: Inline AI Suggestions
43. `/api/ai/suggest` endpoint (detects expense vs income, returns structured suggestion)
44. `AiSuggestChip` component (accept -> fills form, dismiss)
45. Wire into transaction inline form
46. Tests: AI suggest integration tests (mocked LLM), chip component unit tests, suggest flow E2E

### Phase 3C: AI Actions & Memories
47. `/api/ai/action` endpoint (auto-classifies intent: create transaction, record debt payment with linked transaction, query data)
48. AI memories: Auto-learn from user corrections
49. Manual rules UI in settings (view, add, delete memory rules)
50. Tests: Action endpoint integration tests (mocked LLM), memory learning tests

### Phase 3D: Voice Input
51. `VoiceInput` component with MediaRecorder + countdown timer
52. Gemini transcription endpoint (`/api/ai/transcribe`)
53. Wire voice input into transaction form and AI actions
54. Tests: VoiceInput component unit tests, transcription endpoint integration tests

### Phase 3E: Telegram Bot
55. Grammy bot setup + webhook endpoint (`/api/telegram`)
56. Message handling: text, voice, and image inputs -> AI action pipeline
57. Supabase-backed sessions + account linking flow
58. Tests: Webhook integration tests, session management tests

### Phase 4A: Plan Limits & Feature Gating
59. Plan limits config: `lib/config/limits.ts` with typed free/pro limits
60. Server-side feature gating: enforcement helpers for all gated actions (expenses, AI credits, Telegram, attachments, storage)
61. Client-side upgrade prompts when limits are reached
62. Tests: Limit enforcement unit tests, gating integration tests

### Phase 4B: Stripe Integration
63. Stripe Checkout session creation (with promo code support, EUR 2.99/mo)
64. Stripe webhooks: subscription created/updated/deleted -> update `profiles.plan`
65. Customer portal link for self-serve subscription management
66. Tests: Stripe webhook integration tests, upgrade flow E2E

### Phase 4C: In-App Notifications
67. `notifications` table + server helpers (create, mark read, list)
68. `NotificationBell` component with unread count badge
69. Notification dropdown panel (list, mark as read, mark all read)
70. Tests: Notification CRUD integration tests, bell component unit tests

### Phase 4D: Email Reminders & Preferences
71. Notification preferences: per-notification toggle UI in settings
72. Resend integration + reminder email templates
73. Vercel Cron job (`/api/cron/reminders`) with CRON_SECRET protection
74. One-click unsubscribe link in emails
75. Tests: Cron job integration tests, preference enforcement tests

### Phase 4E: Budget Alerts
76. Per-category 80%/100% threshold detection
77. Email + in-app alert notifications with dedup via `categories.budget_*_notified_at` timestamps
78. Tests: Alert threshold unit tests, dedup integration tests

### Phase 4F: Hero Banner System
79. Banner preset library (images + metadata)
80. Banner picker UI ("Change cover" -> preset grid -> apply)
81. Admin banner management (add/remove presets)
82. Tests: Banner change E2E, picker component unit tests

### Phase 4G: Landing Page
83. Marketing single-page with feature highlights
84. Pricing section (public free/pro tiers)
85. Responsive layout, dark mode support

### Phase 4H: Admin Panel
86. Admin route protection (reject non-admins)
87. User management: list users, view details, manage subscriptions
88. Platform analytics dashboard (user counts, revenue, usage)
89. Tests: Admin route protection integration tests

### Phase 4I: Data Export & Account Deletion
90. CSV transaction export endpoint with date range and type filters
91. Account deletion: confirmation flow, cascading data removal
92. Tests: Export endpoint integration tests, account deletion E2E

### Phase 5A: Animations & Toasts
93. Sonner integration for all user actions (save, delete, errors)
94. Page transitions (Framer Motion layout animations)
95. List staggering + micro-interactions throughout

### Phase 5B: Performance & Accessibility
96. Optimistic updates for inline editing (transactions, budgets, reminders)
97. Image optimization + bundle analysis
98. `prefers-reduced-motion` support (disable/reduce all animations)

### Phase 5C: Error Handling & Final Test Pass
99. Error boundaries per route segment (catch unexpected errors gracefully)
100. Fill coverage gaps to meet 80%+ target on `lib/` and `components/`
101. Fix flaky tests, full E2E suite green
