# Phase 2H: Guided Tour & Polish — Progress

## Item 36: Post-Onboarding Guided Tour (DONE)
- [x] Installed `driver.js` (~5KB) for welcome tour with spotlight overlay
- [x] CSS overrides in `globals.css` matching Simplony design system (oklch tokens, serif headings, rounded corners)
- [x] `data-tour` attributes on 6 dashboard elements: hero-banner, summary-cards, budget-overview, recent-transactions, sidebar-nav, bottom-nav
- [x] Tour step definitions with responsive selectors (sidebar on desktop, bottom nav on mobile)
- [x] `TourLauncher` client component — launches on first dashboard visit, renders nothing visually
- [x] Database: `append_tour_step` RPC function (migration 030) — atomic append, mirrors `append_onboarding_step`
- [x] Database types updated with `append_tour_step` function signature
- [x] Server actions: `completeTour()` + `dismissQuickTip()` in `tour-actions.ts`
- [x] Tour query: `fetchTourState()` in `src/lib/queries/tour.ts`
- [x] Layout integration: `tour_completed_at` fetched in dashboard layout, `showTour` passed through shell
- [x] Tour auto-triggers 600ms after first dashboard paint, completes only on final step
- [x] Respects `prefers-reduced-motion` via CSS override

## Item 36b: Contextual Quick Tips (DONE)
- [x] `QuickTip` component — inline, non-blocking callout card with dismiss
- [x] Framer Motion animations (enter/exit) with reduced motion support
- [x] Budget nudge: appears after first transaction, before setting budgets
- [x] Debts nudge: appears after first budget is created
- [x] Tips tracked in `tour_completed_steps` (shared with welcome tour)
- [x] "Got it" dismiss fires server action in background via `useTransition`

## Item 37: Empty State & Skeleton Audit (DONE)
- [x] Audited all empty states and loading skeletons across the app
- [x] Fixed DebtSection inline empty state — consistent rounded-xl + border-dashed + bg-card styling
- [x] Fixed Attachments component — added "No attachments" label + compact "Add" button (was button-only)
- [x] Updated attachments test to match new empty state UI

## Item 38: Tests (DONE)
- [x] Unit tests: `src/components/tour/__tests__/quick-tip.test.tsx` (11 tests)
- [x] Unit tests: `src/components/tour/__tests__/tour-steps.test.ts` (13 tests)
- [x] Updated `dashboard-shell.test.tsx` for new `showTour` prop (5 call sites)
- [x] Updated `attachments.test.tsx` for new empty state UI
- [x] E2E: `e2e/guided-tour.spec.ts` — tour shows on first visit, dismisses, doesn't reappear

## Test Summary
- Vitest: 754 tests passing (15 new tour/polish tests)
- TypeScript: clean (`tsc --noEmit`)
- ESLint: clean
- Build: clean production build

## Files Added
- `supabase/migrations/20260306000030_append_tour_step.sql`
- `src/app/dashboard/tour-actions.ts`
- `src/components/tour/tour-launcher.tsx`
- `src/components/tour/tour-steps.ts`
- `src/components/tour/quick-tip.tsx`
- `src/components/tour/__tests__/quick-tip.test.tsx`
- `src/components/tour/__tests__/tour-steps.test.ts`
- `src/lib/queries/tour.ts`
- `e2e/guided-tour.spec.ts`
- `docs/progress/phase-2h-guided-tour-polish.md`

## Files Updated
- `package.json` / `package-lock.json` (added `driver.js`)
- `src/app/globals.css` (driver.js CSS overrides)
- `src/app/dashboard/layout.tsx` (fetch `tour_completed_at`, pass `showTour`)
- `src/app/dashboard/page.tsx` (quick tips integration)
- `src/components/dashboard/dashboard-shell.tsx` (TourLauncher, `showTour` prop)
- `src/components/dashboard/hero-banner.tsx` (`data-tour` attribute)
- `src/components/dashboard/summary-cards.tsx` (`data-tour` attribute)
- `src/components/dashboard/budget-overview.tsx` (`data-tour` attribute)
- `src/components/dashboard/recent-transactions.tsx` (`data-tour` attribute)
- `src/components/dashboard/sidebar-nav.tsx` (`data-tour` attribute)
- `src/components/dashboard/bottom-nav.tsx` (`data-tour` attribute)
- `src/components/debts/debts-view.tsx` (consistent empty state styling)
- `src/components/attachments/attachments.tsx` (added empty state label)
- `src/components/dashboard/__tests__/dashboard-shell.test.tsx` (`showTour` prop)
- `src/components/attachments/__tests__/attachments.test.tsx` (updated assertion)
- `src/lib/supabase/database.types.ts` (`append_tour_step` function type)
