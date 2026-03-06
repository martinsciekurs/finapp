# Simplony — Agent Guidelines

## Project Overview

Personal Finance Dashboard for busy young professionals. Built with Next.js 16 (App Router), TypeScript (strict), Tailwind CSS 4, shadcn/ui, Supabase (Postgres + RLS + Auth), and Framer Motion.

## Architecture

- **Framework**: Next.js 16 with App Router, Server Components by default
- **State management**: React state + Server Components. No Redux/Zustand. Server Actions for mutations
- **Database**: Supabase with Row Level Security. All data scoped by `user_id`
- **Auth**: Supabase Auth (email/password, no email confirmation)
- **Styling**: Tailwind CSS 4 with CSS custom properties (oklch). All colors via semantic tokens (`bg-background`, `text-primary`, etc.)
- **Validation**: Zod schemas in `src/lib/validations/` — shared between client forms and server actions
- **Forms**: react-hook-form + @hookform/resolvers/zod

## Directory Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── auth/               # Login, sign-up (public)
│   ├── onboarding/         # Post-signup wizard (authenticated)
│   ├── dashboard/          # Protected routes (overview, transactions, budget, etc.)
│   └── api/                # API routes (ai, stripe, telegram, cron, export)
├── components/
│   ├── ui/                 # shadcn/ui primitives (don't edit directly)
│   └── providers/          # Context providers (theme, etc.)
├── lib/
│   ├── config/             # Plan limits, category presets, banner presets
│   ├── supabase/           # Supabase clients (client.ts, server.ts, admin.ts, middleware.ts)
│   ├── validations/        # Zod schemas (transaction, category, debt, reminder, etc.)
│   └── utils/              # Formatting helpers (currency, date)
├── test/                   # Test setup files
supabase/
├── config.toml             # Supabase local config
├── migrations/             # 17 SQL migration files with RLS + pgTAP extension
└── tests/                  # pgTAP database tests (RLS, triggers, constraints)
e2e/                        # Playwright E2E tests
docs/
├── plan/                   # Implementation plan (6 documents)
└── progress/               # Phase completion tracking
```

## Key Conventions

### Code Style
- TypeScript strict mode. No `any` types unless absolutely necessary
- Server Components by default. Add `"use client"` only when needed (hooks, event handlers, browser APIs)
- All Server Actions return `{ success: boolean, data?: T, error?: string }` — never throw to the client
- Use semantic color tokens from the design system — never hardcode colors
- All amounts stored as positive numbers. `type` field distinguishes expense/income
- All IDs are UUIDs (v7 preferred). Never sequential integers
- Timestamps: `created_at` + `updated_at` on all tables, auto-managed via Postgres triggers

### Database
- Always use RLS — every query scoped by `auth.uid() = user_id`
- Three Supabase clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role, admin-only)
- After schema changes: regenerate types with `supabase gen types typescript`
- Currency is display-only (no conversion). Stored in `profiles.currency`

### Testing
- **Unit tests**: Vitest + React Testing Library. Files: `*.test.ts(x)` next to source
- **Database tests**: pgTAP in `supabase/tests/`. Tests RLS policies, triggers, functions, FK/CHECK/UNIQUE constraints
- **E2E tests**: Playwright in `e2e/` directory
- Run: `npm test` (unit), `supabase test db` (database), `npm run test:e2e` (e2e)
- Coverage target: 80%+ on `lib/` and `components/`

### Database Testing (pgTAP)
- Test files live in `supabase/tests/` and run via `supabase test db`
- `00_helpers.sql` provides shared utilities: `create_test_user()`, `authenticate_as()`, `reset_role()`, factory functions for categories/transactions/debts/reminders
- `01_rls_policies.sql` — RLS isolation tests for all 12 tables (owner access, cross-user denial, anon denial, missing policy enforcement)
- `02_triggers.sql` — trigger and function tests (`set_updated_at`, `handle_new_user`, `is_admin`, `update_debt_remaining_on_change`, `daily_usage_update_guard`, `notifications_update_guard`, `attachments_parent_check/cleanup`, `append_onboarding_step`)
- `03_constraints.sql` — FK enforcement (composite FKs, ON DELETE behavior), CHECK constraints (amounts, enums, bounds), UNIQUE constraints
- Each test file wraps in `begin; ... rollback;` for automatic cleanup
- Use `authenticate_as(uid)` / `reset_role()` to switch between user contexts. Always call `reset_role()` before creating test users (the `authenticated` role cannot insert into `auth.users`)
- Use `throws_ok(sql, errcode::char(5), null, description)` for constraint errors — the `::char(5)` cast is required to select the errcode overload
- Use `throws_matching(sql, regex, description)` when error messages contain dynamic values (e.g., UUIDs)

### Fonts
- Headings: Playfair Display (serif) — `font-serif` class
- Body: Geist Sans — `font-sans` class (default)
- Mono: Geist Mono — `font-mono` class

### Dark Mode
- Uses `next-themes` with class strategy
- User can override (System / Light / Dark)
- All components must use semantic tokens, never raw colors

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm test             # Run unit tests
npm run test:watch   # Run unit tests in watch mode
supabase test db     # Run pgTAP database tests
npm run test:e2e     # Run Playwright E2E tests
npm run lint         # ESLint
```

## Implementation Phases

See `docs/plan/06-testing-and-roadmap.md` for the full 5-phase roadmap.
Track progress in `docs/progress/`.

## Important Notes

- AI is a helper, not autopilot. All AI write actions need user confirmation
- No email confirmation for auth (Supabase `enable_confirmations = false`)
- PWA installable — manifest at `app/manifest.ts`
- Mobile-first design. Bottom nav on mobile, sidebar on desktop
- Animations under 300ms. Respect `prefers-reduced-motion`
