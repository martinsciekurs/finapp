# Phase 1: Foundation — Progress

## Project Scaffolding
- [x] Next.js 16 app with TypeScript strict mode, App Router, `src/` directory
- [x] Tailwind CSS 4 with PostCSS integration
- [x] shadcn/ui initialized (new-york style) with 13 core components
- [x] All dependencies installed: Supabase, Zod, react-hook-form, Framer Motion, date-fns, Recharts, next-themes, Sonner, lucide-react

## Global Styling & Theming
- [x] Warm earthy color palette defined as oklch CSS custom properties (light + dark)
- [x] Semantic color tokens: background, card, primary (sage green), accent (gold), muted, destructive, success, warning
- [x] Typography: Playfair Display (serif headings), Geist Sans (body), Geist Mono (code)
- [x] Dark mode via `next-themes` with class strategy (system/light/dark)
- [x] Sonner toast provider configured
- [x] Chart colors (5 earthy tones for Recharts)

## PWA Configuration
- [x] Dynamic manifest at `app/manifest.ts` with app name, icons, theme colors, standalone display
- [x] App icons (192x192, 512x512) — placeholder paths set, actual icons need to be created
- [ ] Service worker setup (@serwist/next) — deferred, not critical for foundation

## Database (Supabase)
- [x] Supabase config.toml with local dev settings, confirmations disabled
- [x] All 18 migration SQL files with full schema:
  - 001: Setup — trigger function (`set_updated_at`) + extensions
  - 002: Profiles (display_name, currency, role, banner, tier, theme, onboarding state, notification prefs)
  - 003: Auto-create profile on auth signup trigger
  - 004: Category groups (user-managed groups for organizing categories)
  - 005: Categories (expense/income, icon, color, group_id NOT NULL, sort_order, type-match trigger)
  - 006: Transactions (amount, type, description, date, source, ai_generated) + indexes
  - 007: Reminders (title, amount, due_date, frequency, auto_create_transaction)
  - 008: Debts (counterparty, type, original/remaining amount)
  - 009: Debt payments (amount, note, linked transaction)
  - 010: Banner presets (color/gradient/image, admin-managed) + seed data
  - 011: Subscriptions (Stripe tracking)
  - 012: Daily usage (AI credit tracking)
  - 013: AI memories (per-user learning rules)
  - 014: Attachments (generic, multi-record-type)
  - 015: Telegram sessions
  - 016: Notifications (in-app, with feed index)
  - 017: `append_onboarding_step` RPC function
  - 099: Enable pgTAP extension
- [x] RLS policies on all tables (user-scoped, admin-only for banner presets)
- [x] `is_admin()` Postgres function for admin role checks
- [x] TypeScript database types placeholder (`database.types.ts`) matching full schema

## Supabase Client Setup
- [x] Browser client (`client.ts`) — `createBrowserClient<Database>`
- [x] Server client (`server.ts`) — `createServerClient<Database>` with cookie handling
- [x] Admin client (`admin.ts`) — `createClient<Database>` with service role key
- [x] Middleware helper (`middleware.ts`) — session refresh for Server Components

## Authentication
- [x] Login page (`/auth/login`) — email/password form with Zod validation, react-hook-form
- [x] Sign-up page (`/auth/sign-up`) — display name + email + password, auto-login on signup
- [x] "Forgot password?" shows informational toast (deferred for v1)
- [x] Cross-links between login and sign-up pages

## Route Protection (Middleware)
- [x] Public routes: `/`, `/auth/*` 
- [x] Auth page redirect: authenticated users visiting `/auth/*` go to `/dashboard`
- [x] Dashboard protection: unauthenticated users go to `/auth/login` with `?next=` param
- [x] Onboarding redirect: users without `onboarding_completed_at` redirected from `/dashboard` to `/onboarding`
- [x] Admin protection: non-admin users accessing `/dashboard/admin/*` redirected to `/dashboard`
- [x] Webhook/cron routes excluded from session auth

## Onboarding Wizard
- [x] 3-step flow: Welcome → Categories → Banner
- [x] Progress bar with step indicator
- [x] Animated step transitions (Framer Motion)
- [x] Step 1 (Welcome): Personalized greeting with display name
- [x] Step 2 (Categories): Expense categories in 5 labeled groups (all pre-selected), income categories (only Salary pre-selected), toggleable chips, count display, minimum 2 expense validation
- [x] Step 3 (Banner): Color + gradient swatches, live preview, selection highlight
- [x] Server action: Creates default category groups, assigns categories with group_id, updates profile banner, marks onboarding complete
- [x] Step progress saved to DB (resume on return)
- [x] Category and banner preset config in `lib/config/`

## Zod Validation Schemas
- [x] Auth schemas (login, sign-up)
- [x] Transaction schema (amount > 0, type enum, source default, date validation)
- [x] Category schema (name, type, icon, color)
- [x] Reminder schema (title, amount, due_date, frequency enum)
- [x] Debt schema + debt payment schema
- [x] Profile schema + notification preferences schema
- [x] AI input schema (100-word / 1000-char limit)
- [x] Attachment schema (5MB max, JPEG/PNG/PDF types)
- [x] Barrel export from `validations/index.ts`

## Utility Functions
- [x] `formatCurrency` — locale-aware with Intl.NumberFormat
- [x] `formatDate` — Today/Yesterday/formatted date
- [x] `formatRelativeTime` — relative time strings
- [x] `formatDateForInput` — YYYY-MM-DD for form fields
- [x] `getCurrentMonthRange` — for budget calculations

## Error Handling
- [x] Global error boundary (`app/error.tsx`) — "Something went wrong" with retry
- [x] Dashboard error boundary (`app/dashboard/error.tsx`) — scoped to dashboard
- [x] Custom 404 page (`app/not-found.tsx`) — links back to dashboard

## Landing Page
- [x] Simple hero section with value prop and CTA
- [x] Header with sign-in and get-started links

## Dashboard Placeholder
- [x] Layout with auth check
- [x] Welcome page with user's display name
- [x] Dashboard-scoped error boundary

## Testing Infrastructure
- [x] Vitest config with jsdom, path aliases, coverage settings
- [x] Test setup file with jest-dom matchers
- [x] Playwright config (chromium + mobile, webServer integration)
- [x] npm scripts: `test`, `test:watch`, `test:coverage`, `test:e2e`, `test:e2e:ui`
- [x] pgTAP enabled via migration (`20260304000099_enable_pgtap.sql`)
- [x] pgTAP test helpers (`supabase/tests/00_helpers.sql`): `create_test_user()`, `authenticate_as()`, `reset_role()`, factory functions
- [x] CI workflow updated with `test-db` job for pgTAP tests

## Tests Written

### Vitest Unit Tests (141 tests / 13 files)
- [x] Transaction schema tests (24 tests) — valid/invalid amounts, types, dates, defaults, source enum (web/telegram/voice), ai_generated, updateTransactionSchema (partial validation)
- [x] AI schema tests (18 tests) — `aiInputSchema` (word count, char limit, empty, whitespace, trim) + `aiSuggestionSchema` (type enum, nullable fields, confidence bounds, missing fields)
- [x] Auth schema tests (11 tests) — login/signup validation
- [x] Debt schema tests (16 tests) — valid debts/payments, validation rules, counterparty max length (100), description max length (500), note max length (500), invalid UUID, zero/negative amounts
- [x] Config tests (26 tests) — categories (groups, fallback), banners (colors, gradients), plan limits (tiers, attachments, AI credits), safeParseInt defaults
- [x] Onboarding server action tests (19 tests) — `completeOnboarding` (auth, validation, banner regex, min categories, sanitization, DB errors), `updateOnboardingStep` (valid/invalid steps, auth, RPC)
- [x] Middleware tests (6 tests) — `updateSession` (env vars, client creation, auth/unauth, cookie sync)
- [x] Supabase client tests (13 tests) — `server.ts` (env vars, client creation, cookie delegation, setAll error handling), `admin.ts` (env vars, service role key, client return), `client.ts` (env vars, browser client creation)
- [x] Utility tests (8 tests) — `cn()` (merge, conditional, undefined/null, empty, Tailwind conflict resolution, arrays, objects)

### pgTAP Database Tests (167 tests / 4 files)
- [x] RLS policy tests (81 tests) — all 12 tables: owner CRUD, cross-user denial (SELECT/INSERT/UPDATE/DELETE), anon lockout, missing policy enforcement, owner UPDATE + DELETE on all applicable tables, subscriptions UPDATE blocked
- [x] Trigger & function tests (49 tests) — `set_updated_at` on 5 tables (profiles, categories, transactions, debts, ai_memories), `handle_new_user` (metadata, email fallback, null email, default currency/role/onboarding_completed_steps), `is_admin`, `update_debt_remaining_on_change` (insert/update/delete/overpayment), `daily_usage_update_guard` (5 immutability checks), `notifications_update_guard` (7 field checks), `attachments_parent_check` (transaction/debt/reminder/nonexistent/cross-user), `attachments_parent_cleanup` (reminder/transaction/debt parents), `append_onboarding_step` (append/idempotent/auth)
- [x] FK & constraint tests (37 tests) — 4 composite FKs with ON DELETE behavior, CHECK constraints (amounts, enums, bounds, counterparty, debts.original_amount, banner_presets.type, reminders.frequency), UNIQUE constraints (categories name+user+type, stripe subscription ID, daily_usage user+date, telegram chat_id)

### E2E Tests (Playwright)
- [x] Auth E2E tests (8 tests) — page rendering, form validation, navigation, redirects
- [x] Onboarding E2E tests (1 test) — auth requirement
- [x] Landing page E2E tests (2 tests) — rendering, CTA navigation
- [x] 404 page test (1 test) — renders for unknown routes

### Summary
- **Vitest**: 141 tests passing
- **pgTAP**: 167 tests passing
- **E2E**: 12 tests defined
- **Total**: 320 tests

## Configuration Files
- [x] `.env.local.example` — all environment variables documented
- [x] `.gitignore` — updated with Playwright reports, env example
- [x] `CLAUDE.md` + `AGENTS.md` (symlink) — agent guidelines
- [x] `components.json` — shadcn/ui configuration

## Known Issues / Deferred
- [ ] Service worker not yet configured (@serwist/next)
