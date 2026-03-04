# Phase 2A: Dashboard Shell & Layout — Progress

## Item 8: Responsive Dashboard Shell
- [x] `HeroBanner` component — renders user banner (color/gradient), greeting overlay, "Change cover" hover button
- [x] `BottomNav` component — floating pill bar (mobile/tablet), 6 items with icons, label on active, 44px touch targets
- [x] `SidebarNav` component — desktop sidebar, collapsible, tooltips when collapsed, aria-expanded
- [x] `NotificationBell` placeholder — bell icon button (actual implementation in Phase 4C)
- [x] `DashboardShell` orchestrator — composes all shell components, skip-to-content link
- [x] Updated `dashboard/layout.tsx` — auth check, profile fetch with error handling, banner parsing
- [x] Placeholder sub-pages: transactions, budget, reminders, debts, settings

## Item 9: Loading Skeletons
- [x] `Skeleton` shadcn component installed
- [x] `BannerSkeleton`, `SidebarSkeleton`, `BottomNavSkeleton`, `ContentSkeleton` components
- [x] `DashboardShellSkeleton` full-page skeleton
- [x] `dashboard/loading.tsx` reuses `ContentSkeleton` (shell already visible from layout)

## Item 10: Tests
- [x] `nav-items.test.ts` — 10 tests (item count, required props, unique hrefs/labels, destinations, isNavItemActive logic)
- [x] `hero-banner.test.tsx` — 10 tests (greeting times, banner types, text contrast, change cover button)
- [x] `bottom-nav.test.tsx` — 8 tests (nav landmark, links/hrefs, active states, nested routes, touch targets)
- [x] `sidebar-nav.test.tsx` — 8 tests (nav landmark, links/hrefs, title, active states, collapse/expand, tooltips, aria-expanded)
- [x] `notification-bell.test.tsx` — 2 tests (accessible label, variant)
- [x] `shell-skeleton.test.tsx` — 4 tests (renders, skeleton elements, banner/content dimensions)
- [x] `dashboard-shell.test.tsx` — 5 tests (sub-components render, children in main, props forwarding, skip link, main id)
- [x] `banners.test.ts` — expanded with 18 new tests: DEFAULT_BANNER, BANNER_VALUE_RE, parseBanner (valid/invalid/edge cases)

## Code Quality Improvements (Post-Review)
- [x] Deduplicated `BannerData` type — single definition in `lib/config/banners.ts`, imported everywhere
- [x] Extracted `parseBanner()` to shared util with regex validation (matches onboarding security pattern)
- [x] Extracted `isNavItemActive()` helper — shared between BottomNav and SidebarNav
- [x] Removed unnecessary `"use client"` from `DashboardShell` (Server Component composes Client Components)
- [x] Eliminated `loading.tsx` / `ContentSkeleton` duplication
- [x] Added profile error handling in `layout.tsx` (consistent with onboarding pattern)
- [x] Added skip-to-content link for keyboard accessibility
- [x] Distinct `aria-label` on mobile vs desktop nav landmarks
- [x] Added `aria-expanded` to sidebar collapse toggle
- [x] Added `type="button"` to Change cover button
- [x] Added `useReducedMotion()` in HeroBanner for animation accessibility
- [x] Used `afterEach` for timer cleanup in tests (prevents leaks on failure)
- [x] All `metadata` exports use `Metadata` type annotation
- [x] Reused `BANNER_VALUE_RE` from shared config in onboarding actions (eliminated duplication)

## New Dependencies (shadcn/ui)
- `skeleton`, `tooltip`

## Test Summary
- **Vitest**: 206 tests passing (65 new)
- **Lint**: 0 errors, 0 warnings
- **Build**: Clean production build

## Known Deferred Items
- [ ] `prefers-reduced-motion` for non-Framer CSS transitions (sidebar width)
- [ ] Onboarding guard in dashboard layout (currently handled by middleware; layout-level check deferred)
- [ ] Banner picker functionality (Phase 4F)
- [ ] Notification bell functionality (Phase 4C)
