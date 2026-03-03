# Design & UI

## Design & Aesthetic Direction

The application moves away from "tech-cold" blues and whites toward a warm, earthy palette that feels grounded and premium.

### Color Palette

All colors defined as CSS custom properties (HSL) via Tailwind theme config. Both light and dark themes ship in v1.

| Role        | Light         | Dark            | Usage                              |
| ----------- | ------------- | --------------- | ---------------------------------- |
| Background  | `#fdf6ee`     | `#1a1a1a`       | Main page background               |
| Card        | `#ffffff`     | `#252525`       | Surface areas and containers       |
| Primary     | `#2d4a3e`     | `#5b9a82`       | Buttons, active states             |
| Accent      | `#c9a84c`     | `#d4b85a`       | Chart highlights, gold accents     |
| Muted       | `#f5ede0`     | `#2a2a2a`       | Secondary backgrounds              |
| Foreground  | `#1a1a1a`     | `#f0ebe4`       | Body text                          |
| Destructive | `#dc3545`     | `#e05563`       | Error states and delete actions    |

### Dark Mode

Default follows system preference (`prefers-color-scheme`), user can override in settings (System / Light / Dark). Persisted in `localStorage` and `profiles.theme_preference`. Uses `next-themes` for toggle logic + SSR-safe hydration.

- All components use semantic color tokens (`bg-background`, `text-foreground`, `bg-card`, etc.) — never raw colors.
- Banner photos get a subtle dark overlay in dark mode for readability.

### Typography & Icons

- **Headings**: `Playfair Display` (Serif) - Elegant, editorial feel.
- **Body**: `Geist Sans` (Sans-serif) - Readability and modern speed.
- **Icons**: `lucide-react` - Navigation, category badges, summary cards, action buttons. Never decorative-only.

### Animations (Framer Motion)

Subtle, purposeful animations throughout:
- **Page transitions**: Fade + slight vertical slide between dashboard routes.
- **List items**: Staggered entrance when transactions/reminders load.
- **Cards**: Gentle scale-up on mount, micro-hover lift.
- **Inline form**: Smooth expand/collapse when adding a transaction.
- **AI suggestions**: Fade-in with a slight blur-to-clear effect as suggestions appear.
- **Toast notifications**: Slide-in from top with spring physics.
- **Number changes**: Animated counting for summary totals (e.g., "Total Spent" ticks up).
- **Onboarding steps**: Slide transitions between steps with progress indicator animation.
- **Voice input**: Pulsing microphone icon while recording, circular countdown timer for the 60-second limit.

Keep all animations under 300ms. Respect `prefers-reduced-motion`.

---

## Application Structure

```
app/
├── layout.tsx                # Root: Fonts, Global CSS, Providers
├── page.tsx                  # Landing/marketing page (public)
├── manifest.ts               # PWA manifest (dynamic)
├── not-found.tsx              # Custom 404 page
├── error.tsx                  # Global error boundary
├── auth/
│   ├── login/                # Login page
│   └── sign-up/              # Registration page
├── onboarding/               # Post-signup onboarding wizard
│   └── page.tsx
├── dashboard/                # Protected route group
│   ├── error.tsx             # Dashboard-scoped error boundary
│   ├── layout.tsx            # Dashboard Shell: Hero Banner + Floating Nav
│   ├── page.tsx              # Overview: Summary Cards + Charts
│   ├── transactions/         # CRUD: Transaction List + Inline Add (expenses & income)
│   ├── budget/               # Management: Category Cards + Progress
│   ├── reminders/            # Tracking: Bills + Due Dates
│   ├── debts/                # Debt tracking: Who owes whom
│   ├── settings/             # Profile, Banner, Theme, Subscription, Notifications, AI Preferences, Data Export, Account Deletion
│   └── admin/                # Admin-only: Users, Presets, Analytics
├── api/
│   ├── ai/
│   │   ├── suggest/route.ts  # Inline transaction suggestions endpoint
│   │   ├── action/route.ts   # AI action endpoint (auto-classifies intent)
│   │   └── transcribe/route.ts # Voice transcription (+ optional combined parse)
│   ├── telegram/
│   │   └── webhook/route.ts  # Telegram bot webhook handler
│   ├── stripe/
│   │   └── webhook/route.ts  # Stripe webhook handler
│   ├── cron/
│   │   └── reminders/route.ts # Vercel Cron: daily reminder + budget alert check
│   └── export/
│       └── route.ts          # CSV export of user's transaction data
lib/
├── config/
│   └── limits.ts             # Centralized plan limits & rate limits
├── validations/              # Shared Zod schemas
│   ├── transaction.ts        # Transaction create/update schemas (expense + income)
│   ├── category.ts           # Category schemas
│   ├── reminder.ts           # Reminder schemas
│   ├── debt.ts               # Debt + payment schemas
│   ├── attachment.ts         # Attachment schemas (file type, size, count limits)
│   ├── profile.ts            # Profile update schemas
│   └── ai.ts                 # AI input validation (max 100 words, etc.)
├── supabase/
│   ├── client.ts             # Browser-side client
│   ├── server.ts             # Server-side client (SSR)
│   └── admin.ts              # Service role client (admin routes only)
└── utils/                    # Shared helpers, date formatting, currency formatting, etc.
```

---

## Responsive Design

Mobile-first approach. The app is primarily used on phones (adding expenses on the go) but must work well on desktop too.

### Breakpoints

| Breakpoint | Width      | Layout Changes                                    |
| ---------- | ---------- | ------------------------------------------------- |
| Mobile     | < 640px    | Single column. Bottom pill nav. Full-width cards.  |
| Tablet     | 640-1024px | Two-column grid for summary cards. Bottom nav.    |
| Desktop    | > 1024px   | Sidebar nav replaces bottom nav. Multi-column dashboard grid. Wider content area with max-width constraint. |

### Navigation Adaptation
- **Mobile/Tablet**: Floating bottom pill bar (`BottomNav`). 6 items with icons, label shown only on active. Items: Overview, Transactions, Budget, Reminders, Debts, Settings.
- **Desktop**: Collapsible sidebar on the left. Same items, with labels always visible. Hero banner spans the main content area only (not the sidebar).

### Touch Targets
- All interactive elements minimum 44x44px on mobile.
- Inline edit and transaction form inputs sized for thumb input.
- Voice input button large and accessible (bottom-right FAB on mobile).

---

## UI Layout & Key Components

### Landing Page (`/`)
A single-page marketing site: hero section with value prop, feature highlights (3-4 cards), pricing tiers (Free vs Pro), and CTA to sign up. Warm aesthetic consistent with the app.

### Dashboard Shell
- **Hero Banner**: Full-width banner at the top of the dashboard. Configurable per user (Notion-style). Users pick from admin-managed presets: solid colors, gradients, or curated photos. Serif title overlay with user's name ("Good morning, Alex"). Subtle parallax on scroll.
- **Floating Navigation**: Mobile-friendly pill bar fixed at bottom (sidebar on desktop). Semi-transparent backdrop blur. Lucide icons with labels on active state.

### Core Components

| Component         | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `BottomNav`       | Floating pill navigation with active state + icon labels.  |
| `SidebarNav`      | Desktop sidebar navigation. Same items as BottomNav.       |
| `HeroBanner`      | Configurable banner with preset picker (colors/gradients/images). |
| `SummaryCard`     | "Total Spent", "Total Income", "Net Balance", "Weekly Average", "Upcoming Bills" with animated counters. |
| `BudgetChart`     | Recharts bar chart - Budget vs. Actual per category (expense categories only). |
| `TransactionForm` | Inline input row with type toggle (expense/income). Supports natural language ("$45 lunch with team" or "received 200 freelance payment"). AI parses and suggests category, description, amount, and type in real-time. Includes attachment button. |
| `Attachments`     | Reusable file attachment component for any record (transaction, debt, reminder). |
| `VoiceInput`      | Microphone button that records audio via MediaRecorder, sends to AI transcription endpoint (Gemini), and feeds the result into `TransactionForm`. Pulsing animation + countdown timer while recording. |
| `TransactionList` | Grouped by date, staggered entrance animation. Color-coded: expenses in foreground, income in primary/green. Filter tabs: All / Expenses / Income. |
| `InlineEdit`      | Click-to-edit for budgets and profile details.             |
| `AiSuggestChip`   | Small pill that fades in below input with AI suggestion (e.g., "Expense: Food - Dining Out?" or "Income: Debt Repayment?"). Click to accept, dismiss to ignore. |
| `NotificationBell`| Bell icon in the nav bar with unread count badge. Clicking opens a dropdown panel listing recent notifications (budget alerts, reminder due dates, debt settlements). Each notification is clickable (navigates to relevant page) and can be marked as read. "Mark all as read" action at the top. |
| `DebtCard`        | Shows counterparty, amount owed, direction (I owe / they owe), progress toward settlement. |
| `DebtPaymentForm` | Quick inline form to log a payment against a debt.         |
| `BannerPicker`    | Modal/sheet with grid of preset options (colors, gradients, photos). |
| `OnboardingWizard`| Multi-step onboarding: categories, banner.                 |
| `PricingCard`     | Free vs Pro comparison for settings page and landing page. |
| `EmptyState`      | Reusable empty state component with illustration, message, and CTA. |

### Empty & Error States

Every data-driven view must handle three states gracefully:

| State     | Treatment                                                         |
| --------- | ----------------------------------------------------------------- |
| **Loading** | Skeleton placeholders matching the shape of the real content. Subtle shimmer animation. |
| **Empty**   | Friendly illustration (simple, line-art style matching the earthy aesthetic) + contextual message + primary CTA. Examples: "No transactions yet - add your first one" with an inline form ready. "No debts - you're all clear!" |
| **Error**   | Toast notification for transient errors (network, save failures). Inline error message with retry button for page-level failures. Never a blank screen. |

### Form Validation (Zod)

All forms use Zod schemas for validation, shared between client and server:
- **Client**: `react-hook-form` with `@hookform/resolvers/zod` for instant inline validation.
- **Server**: Same Zod schemas validate in Server Actions / API routes before DB writes.
- **AI output**: Zod schemas with `zod-to-json-schema` for Vercel AI SDK structured outputs, ensuring AI responses are type-safe. AI output schema includes a `type` field (`'expense' | 'income'`) so the AI can distinguish between spending and receiving money.
- Validation errors appear inline below fields with a subtle fade-in. Never alert dialogs.

### Screens & User Actions

Concise reference of every screen. Layout specifics, spacing, and animation details are left to the implementor.

#### Public Screens

**`/` — Landing Page**
- Hero section with value prop, 3-4 feature highlight cards, pricing table (Free vs Pro), footer
- Actions: Sign up, Log in

**`/auth/login`**
- Email + password form, hero image background, link to sign-up
- Actions: Submit → authenticate → redirect to `/dashboard` (or `/onboarding` if first time)

**`/auth/sign-up`**
- Display name + email + password form, link to login
- Actions: Submit → create account → auto-login → redirect to `/onboarding`

#### Protected — Onboarding

**`/onboarding`**
- Multi-step wizard (3 steps) with progress indicator, slide transitions
- Step 1 — Welcome: greeting with display name, brief value prop, single "Let's get started" CTA
- Step 2 — Categories: two sections (Expenses + Income). Expense categories shown in labeled subsections (Essentials, Lifestyle, Health & Growth, Financial, Other) — all pre-selected. Income categories in a single group — only Salary pre-selected. Each card toggleable. "Add custom" inline field with icon picker available for both sections. Minimum 2 expense categories required
- Step 3 — Banner: color/gradient preset grid (no photos — keep it fast)
- Actions per step: Next, Back, Toggle category, Add custom category, Pick banner, Complete → save all → redirect to `/dashboard` + launch guided tour

#### Protected — Dashboard

**Global elements** (present on all dashboard pages):
- Hero banner (configurable, "Change cover" on hover)
- Navigation: bottom pill bar (mobile/tablet) or sidebar (desktop) — Overview, Transactions, Budget, Reminders, Debts, Settings
- `NotificationBell` in top bar: unread count badge, dropdown with recent notifications, mark as read, click → navigate to relevant page
- Budget warning banner (dismissible) when any category exceeds 80%

---

**`/dashboard` — Overview**
- Summary cards: Total Spent (this month), Total Income (this month), Net Balance, Upcoming Bills count
- Budget vs Actual bar chart (expense categories only)
- Recent transactions list (last 5)
- Actions: Click summary card → navigate to relevant page, Click transaction → go to `/dashboard/transactions`

---

**`/dashboard/transactions`**
- `TransactionForm`: inline input row with expense/income type toggle, natural language input field, `AiSuggestChip` below, attachment button, submit button
- `VoiceInput`: mic FAB (mobile) or button beside input (desktop)
- Search input: filters by description text (server-side `ILIKE`)
- Filter tabs: All / Expenses / Income
- `TransactionList`: grouped by date (newest first), staggered entrance, cursor-based pagination (infinite scroll on mobile, "Load more" on desktop, 20 per page)
- Each row: type indicator (color/icon), amount, category badge (icon + color), description, date, paperclip icon if attachments
- Actions:
  - Add: type text or use voice → accept/dismiss AI chip → submit
  - Inline edit: click row → expand edit view (amount, category, description, date, type) → save/cancel
  - Delete: icon button on row (desktop) or swipe (mobile) → confirmation
  - Attachments: add/view/remove files on any transaction

---

**`/dashboard/budget`**
- Expense category cards in a grid (sorted by `sort_order`)
- Each card: icon, name, progress bar, spent / limit amounts (e.g., "EUR 160 / EUR 300")
- Progress bar color: green (<80%), amber (80–99%), red (≥100%)
- Categories with no `budget_limit` show spending total only, no bar
- "Add Category" button
- Actions:
  - Inline edit budget limit: click the limit amount → number input → save
  - Add category: modal/inline form (name, icon picker, color, optional budget limit)
  - Edit category: name, icon, color
  - Delete category: if 0 transactions reference it, delete immediately. If transactions reference it, deletion is blocked — user must reassign them to another category first (dropdown picker → bulk-update → delete). Prevents orphaned transactions.
  - Reorder: drag-and-drop or sort order buttons

**How budgets work**: Budgets operate on a **monthly calendar cycle** (1st of the month to the last day). Each expense category can have an optional `budget_limit` — the maximum the user intends to spend in that category per month (e.g., "I want to spend ≤EUR 300 on Food"). Categories with no `budget_limit` are untracked — they show spending totals but no progress bar. Progress = `SUM(transactions.amount WHERE type='expense' AND category_id=X AND date in current month)` / `budget_limit`. At month rollover, spending resets to 0 naturally (new queries return new sums). No rollover, no carry-forward.

---

**`/dashboard/reminders`**
- Reminder list grouped by status: Upcoming (sorted by due date), Overdue (past due + not paid), Paid (one-time reminders that are done)
- Each row: title, amount, due date, frequency badge (monthly/weekly/yearly/one-time), category badge, paid status
- "Add Reminder" button
- Actions:
  - Add: title, amount, due_date, frequency, category, auto_create_transaction toggle (default on)
  - Mark as paid: button on row → for recurring: creates expense transaction (if enabled), advances due_date to next cycle, resets is_paid. For one-time: marks done permanently. See [Notifications & Reminders](04-features.md#notifications--reminders) for full lifecycle.
  - Edit: inline or modal (title, amount, due_date, frequency, category)
  - Delete: confirmation required

---

**`/dashboard/debts`**
- Summary bar at top: "You owe EUR X" / "You're owed EUR Y" / "Net: ±EUR Z"
- Active debts grouped by direction: "I owe" section, "They owe me" section
- Settled debts: collapsed section at bottom, expandable
- Each `DebtCard`: counterparty name, original amount, remaining amount, progress bar, "Log payment" button
- "Add Debt" button
- Actions:
  - Add debt: counterparty name, amount, direction (I owe / they owe me), optional description
  - Log payment: inline form on card (amount, optional note) → creates debt payment + linked transaction → updates remaining amount (settled when remaining = 0)
  - View payment history: expandable section on card showing all payments with dates and notes
  - Add/view attachments on debt
  - Delete debt: confirmation required

---

**`/dashboard/settings`**

Sectioned single page (or tabs). Each section is a distinct card/group:

- **Profile**: Display name (inline edit), currency selector dropdown
- **Appearance**: Theme toggle (System / Light / Dark), hero banner picker (opens `BannerPicker` sheet)
- **Notifications**: Per-notification row with two toggles each — email and in-app (reminder_due_dates, budget_80_percent, budget_100_percent). `reminder_days_before` number stepper (1–7)
- **AI Preferences**: List of learned rules (auto/manual badge), delete button per rule, "Add rule" inline text field for manual rules
- **Telegram**: Connect button → shows 6-char code with instructions, or "Connected" status with disconnect button
- **Subscription**: Current plan display, usage summary (transactions this month, AI credits today), Upgrade button → Stripe Checkout, or Manage → Stripe Customer Portal
- **Your Data**: Export transactions — date range picker (presets: This month, Last 3 months, This year, All time + custom), type filter (All/Expenses/Income), Download CSV button
- **Danger Zone**: Red "Delete Account" button → confirmation modal ("This will permanently delete your account and all data. Type DELETE to confirm.") → cascade delete → sign out → redirect to `/`

---

**`/dashboard/admin`** (admin role only, service-role client)
- **Users tab**: paginated table (display name, email, tier, created_at), deactivate toggle per user
- **Banner Presets tab**: CRUD list for colors, gradients, images — add/edit/delete presets
- **Analytics tab**: total users, active users (30d), revenue summary, total transactions, AI credits used today

---

## Hero Banner System

### Preset Categories (Admin-Managed)

**Solid Colors** (~8 presets):
Earthy tones matching the palette - warm cream, sage green, dusty rose, terracotta, slate blue, charcoal, soft gold, muted lavender.

**Gradients** (~8 presets):
Named gradients - "Sunrise" (warm peach to gold), "Forest" (dark olive to sage), "Ocean" (deep teal to soft blue), "Dusk" (purple to warm orange), "Sand" (beige to soft brown), "Mint" (light green to white), "Storm" (dark gray to light gray), "Autumn" (amber to deep red).

**Curated Photos** (~15-20 presets):
Royalty-free images bundled in the repo under `public/banners/`. Categories:
- Nature: mountains, forest canopy, ocean horizon, meadow, desert dunes
- Abstract: soft watercolor textures, marble, gradient mesh, paper textures
- Minimal: architectural details, plant close-ups, coffee flat-lay

All images optimized (WebP, max 1920px wide, ~100-200KB each). Served via Next.js Image component.

### User Flow
- User clicks a small "Change cover" button that appears on hover over the banner (Notion-style)
- Opens a `BannerPicker` sheet with three tabs: Colors, Gradients, Photos
- Selection saves to `profiles.hero_banner` as JSONB
- No custom uploads for now

---

## Reference Examples

Design inspiration (not strict templates - make it better):

![](../reference-images/01-example.png)
![](../reference-images/02-example.png)
![](../reference-images/03-example.png)
![](../reference-images/04-example.png)
![](../reference-images/05-example.png)
![](../reference-images/06-example.png)
![](../reference-images/07-example.png)
![](../reference-images/img.png)
![](../reference-images/img_1.png)
![](../reference-images/img_2.png)
