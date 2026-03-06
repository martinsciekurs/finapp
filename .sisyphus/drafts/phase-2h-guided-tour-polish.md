# Draft: Phase 2H — Guided Tour & Polish

## Requirements (confirmed)
- Post-onboarding guided tour (tooltip flow across dashboard sections)
- Audit all empty states and loading skeletons for consistency
- Tests: Guided tour E2E (shows on first visit, dismisses correctly)

## ResearIn our current planning for Phase 2H, we've made significant strides in understanding the onboarding guided tour implementation. Notably, we discovered that the database already includes relevant fields (`tour_completed_steps` and `tour_completed_at`) within the profiles table, which positions us well for effectively tracking user interactions during the guided tour. Additionally, a comprehensive audit of empty states and loading skeletons has been completed to ensure a consistent user experience. As we await final approvals from the librarian, our next steps will focus on synthesizing our findings and preparing for interviews to refine the tour experience further.ch Findings

### Database Infrastructure (READY)
- `profiles.tour_completed_steps` (jsonb, default `'[]'`) — already exists in migration `20260304000002_profiles.sql`
- `profiles.tour_completed_at` (timestamptz, nullable) — already exists
- Pattern mirrors `onboarding_completed_steps` / `onboarding_completed_at`
- No server actions or client code exist yet for tour

### Onboarding → Dashboard Flow
- Onboarding completes via `completeOnboarding()` → sets `onboarding_completed_at` → redirects to `/dashboard`
- Dashboard layout (`layout.tsx`) loads profile (`display_name`, `hero_banner`) and renders `DashboardShell`
- Middleware (`proxy.ts`) checks `onboarding_completed_at` — redirects to `/onboarding` if null
- **First dashboard visit** = `onboarding_completed_at` is set AND `tour_completed_at` is null

### Dashboard Sections (Tour Targets)
1. **Hero Banner** — Greeting + user-chosen banner + "Change cover" button
2. **Summary Cards** — 3 cards: Income, Spending, Scheduled Payments (with period selectors)
3. **Budget Overview** — Category progress bars or empty state
4. **Recent Transactions** — Last 5 transactions or empty state
5. **Sidebar Nav** (desktop) — 6 items: Overview, Transactions, Budget, Reminders, Debts, Settings
6. **Bottom Nav** (mobile) — Same 6 items in fixed bottom bar

### Existing UI Components (Reusable)
- `Tooltip` (Radix) — already used in sidebar collapsed state
- `Popover` (Radix) — full API with Header, Title, Description, Anchor
- `Dialog` — for modal steps if needed
- `Framer Motion` — already used throughout for animations
- `TooltipProvider` — wraps entire DashboardShell (delayDuration=0)

### Empty State & Skeleton Audit Results
**Strengths**:
- Centralized `EmptyState` component (icon + title + desc + optional CTA)
- Every major page has dedicated `loading.tsx` + skeleton component
- `motion-safe:animate-pulse` respects prefers-reduced-motion
- Consistent error boundaries (global + dashboard level)

**Inconsistencies found**:
1. DebtSection uses inline dashed border text instead of EmptyState component (LOW)
2. Attachments component has no visual empty state — just "Attach file" button (LOW)
3. Settings page may lack `loading.tsx` skeleton (MEDIUM — needs check)

### Tour Library Options
- No tour library currently installed (checked package.json)
- Existing Radix Popover has rich API (Anchor, Header, Title, Description)
- Options to evaluate: react-joyride, @reactour/tour, custom with Radix Popover

## Technical Decisions
- (pending) Tour library choice: third-party vs custom
- (pending) Tour step content and order
- (pending) Mobile vs desktop tour differences
- (pending) Resume/skip behavior

## Open Questions
1. Which tour library approach? (custom vs third-party)
2. How many tour steps? What sections to highlight?
3. Should tour be different on mobile vs desktop?
4. Skip/dismiss behavior — can user re-trigger tour?
5. Test strategy — TDD or tests after?

## Scope Boundaries
- INCLUDE: Guided tour feature, empty state/skeleton audit fixes
- EXCLUDE: (to be confirmed)
