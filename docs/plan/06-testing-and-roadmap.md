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

### Phase 2: Core App
8. Responsive dashboard shell: Hero banner (with default), bottom nav (mobile) + sidebar nav (desktop), notification bell, guided tour (post-onboarding tooltip flow)
9. Dashboard overview: Summary cards with animated counters (Total Spent, Total Income, Net Balance), budget chart
10. Transactions: List view (grouped by date, filterable by type) + inline add form with type toggle and Zod validation
11. Budget: Category cards with progress bars, inline edit (expense categories only)
12. Reminders: Bill tracking, "Mark as Paid", due date display
13. Debts: Debt list, add debt, log payment (with linked transaction creation), auto-settle, summary totals
14. File attachments: Reusable `Attachments` component across transactions, debts, reminders
15. Empty states for all views
16. Loading skeletons for all data-fetching views
17. Tests: Transaction CRUD E2E (expense + income), debt lifecycle E2E (including linked transactions), component unit tests, Zod schema tests

### Phase 3: AI & Intelligence
18. Vercel AI SDK setup (Gemini as primary, provider-agnostic config)
19. AI input validation: 100-word limit, shared Zod schema
20. AI credits system: `daily_usage` table, unified credit check
21. Inline transaction suggestions: `/api/ai/suggest` + `AiSuggestChip` component (detects expense vs income)
22. AI actions endpoint: `/api/ai/action` (auto-classifies intent: create transaction, record debt payment with linked transaction, query data)
23. AI memories: Auto-learn from corrections + manual rules UI in settings
24. Voice input: MediaRecorder + Gemini transcription endpoint, `VoiceInput` component with countdown timer
25. Telegram bot: Grammy setup, webhook (text + voice + image handling), Supabase-backed sessions, account linking flow
26. Tests: AI suggest integration tests (mocked LLM), AI credit enforcement tests, memory learning tests, voice input component tests

### Phase 4: Monetization & Notifications
27. Plan limits config: `lib/config/limits.ts` with typed free/pro limits
28. Stripe integration: Checkout (with promo codes), webhooks, customer portal (EUR 2.99/mo)
29. Feature gating: Server-side enforcement for all gated actions (expenses, AI credits, Telegram, attachments, storage)
30. Notification preferences: Per-notification toggle UI in settings
31. Email reminders: Resend integration, Vercel Cron job (with CRON_SECRET protection), reminder templates, one-click unsubscribe
32. Budget alerts: Per-category 80%/100% email + in-app notifications with dedup via `categories.budget_*_notified_at` timestamps
33. In-app notification system: `notifications` table, `NotificationBell` component, notification dropdown panel, mark as read
34. Hero banner system: Preset library, picker UI, admin management
35. Landing page: Marketing single-page with pricing (public tiers only)
36. Admin panel: User management, preset management, platform analytics
37. Data export: CSV transaction export endpoint with date range and type filters
38. Account deletion: Confirmation flow, cascading data removal
39. Tests: Stripe webhook integration tests, upgrade flow E2E, limit enforcement tests, banner change E2E, cron job tests, account deletion E2E

### Phase 5: Optimization
40. Animations: Page transitions, list staggering, micro-interactions throughout
41. Toasts: Sonner integration for all user actions (save, delete, errors)
42. Performance: Optimistic updates for inline editing, image optimization, bundle analysis
43. `prefers-reduced-motion` support
44. Error boundaries: Catch unexpected errors gracefully per route segment
45. Final test pass: Fill coverage gaps, fix flaky tests, full E2E suite green
