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

### Test Infrastructure
- `vitest.config.ts` with path aliases matching `tsconfig.json`.
- Supabase test helpers: factory functions for creating test users, expenses, categories, debts (using Supabase's local dev stack or mocked client).
- Playwright config: run against local dev server. Use Supabase local instance for E2E.
- CI: Run unit + integration tests on every PR. E2E tests on merge to main.

### Coverage Targets
- Unit/Integration: 80%+ coverage on `lib/` and `components/` directories.
- E2E: All 8 critical flows listed above must pass.
- No coverage requirement on layout/page files (thin wrappers).

---

## Implementation Roadmap

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

### Phase 2D: Budget Management
20. Category cards with progress bars
21. Inline budget edit (expense categories only)
22. Empty state + loading skeleton for budget view
23. Tests: Budget management E2E, progress bar unit tests

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
