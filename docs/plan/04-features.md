# Features

## Debts Tracking

A simple but complete debt tracker at `/dashboard/debts`. Tracks money owed to/from friends, family, or institutions (mortgage, loans).

### Features
- **Add debt**: Counterparty name, amount, direction (I owe them / they owe me), optional description.
- **Log payment**: Record partial or full payments against a debt. Each payment reduces the remaining amount **and creates a linked transaction** (expense if I'm paying them, income if they're paying me). This keeps the financial ledger complete - debt movements show up in the transactions list.
- **Auto-settle**: When remaining amount reaches 0, the debt is settled (derived from `remaining_amount = 0` — no separate flag). An in-app notification is created to confirm settlement.
- **Views**: Active debts (`remaining_amount > 0`, grouped by "I owe" / "They owe me") and settled debts (`remaining_amount = 0`, collapsed, accessible). Summary at the top: "You owe X total" / "You're owed Y total" / "Net: +/-Z".
- **Debt card UI**: Shows counterparty name, original vs. remaining amount, a simple progress bar, and a quick "Log payment" button.

### Simplicity Principle
- No interest calculations, no payment schedules, no recurring debt logic. Just: who, how much, which direction, and payment log.
- Counterparty is a free-text name field (not linked to other users). No social features.

---

## File Attachments

A minimal, reusable attachment system for any record type (expenses, debts, reminders). Non-intrusive - the attachment UI never dominates the record.

### Supported Record Types

| Record      | Use Case                                                  |
| ----------- | --------------------------------------------------------- |
| Transaction | Receipt photo, invoice PDF, income proof                  |
| Debt        | Loan agreement, payment proof, screenshot of a transfer   |
| Reminder    | Bill document, contract                                   |

### UI (`Attachments` Component)

- **On the record row/card**: If files are attached, a small paperclip icon + count badge (e.g., "1") appears. Clicking opens a preview popover.
- **Adding files**: A small paperclip button on the record's detail/edit view. Click opens the native file picker. Drag-and-drop on desktop. On mobile, the file picker allows camera capture.
- **Preview**: Image files show an inline thumbnail. PDFs show a file icon + filename. Click opens a full preview (lightbox for images, new tab for PDFs).
- **Removing files**: Small "x" button on each attachment in the edit view. Deletes from Supabase Storage and removes the DB row. Confirmation required.
- **Telegram images**: When a transaction is created via Telegram with a photo, the image is automatically saved as an attachment on the transaction.

### Constraints
- Max **3 files per record**. Keeps it simple and prevents abuse.
- Max **5MB per file**.
- Accepted types: JPEG, PNG, PDF.
- Validated both client-side (before upload) and server-side (at storage).

### Storage
- Supabase Storage bucket: `attachments`
- Path convention: `{user_id}/{record_type}/{record_id}/{filename}`
- RLS on storage: users can only access paths under their own `user_id` prefix.

---

## Notifications & Reminders

### Notification Types

Each notification type has **two independent channels** — email and in-app — that the user can toggle separately in settings (`profiles.notification_preferences` JSONB):

| Notification             | Default (email / in-app) | Description                                          |
| ------------------------ | ------------------------ | ---------------------------------------------------- |
| `reminder_due_dates`     | On / On                  | X days before a bill/reminder is due.                |
| `budget_80_percent`      | On / On                  | Spending hits 80% of a **per-category** `budget_limit`. |
| `budget_100_percent`     | On / On                  | Spending hits 100% of a **per-category** `budget_limit`. |

Additional setting: `reminder_days_before` (integer, default `1`) - how many days before due date to send the reminder notification.

A user might want in-app budget alerts (visible next time they open the app) but not email. Or email reminders for bills but no in-app clutter. Each combination is valid. If both channels are off for a type, that notification is fully disabled.

### Settings UI

In `/dashboard/settings`, a "Notifications" section shows each notification type as a row with **two toggle switches**: one for email, one for in-app. Layout per row: notification label + short description on the left, email toggle and in-app toggle on the right. The `reminder_days_before` value is an inline number stepper (1-7 range) shown below the reminder row.

### Recurring Reminder Lifecycle

`due_date` always represents the **next upcoming** due date. The lifecycle differs by frequency:

**One-time reminders**: Mark as paid → `is_paid = true`. The reminder stays in the "Paid" section permanently. No date advancement.

**Recurring reminders** (monthly, weekly, yearly): Mark as paid →
1. If `auto_create_transaction` is `true` (default), create an expense transaction linked to the reminder's `category_id` with the reminder's `amount` and today's date. This keeps the financial ledger accurate without the user manually entering the same expense. Only one transaction is created regardless of how many cycles were missed.
2. Advance `due_date` to the **next future occurrence** by stepping in cycle increments (`+ 1 month`, `+ 1 week`, or `+ 1 year`) until the date is in the future. This handles overdue catch-up in a single action — the user never has to "mark paid" multiple times to skip past missed cycles.
3. Reset `is_paid = false` (ready for the next cycle).
4. Reset `last_notified_at = null` (so the notification fires again for the next cycle).

This means recurring reminders never "complete" — they perpetually cycle. The user sees the next future due date immediately after marking the current one paid. To stop a recurring reminder, the user deletes it.

**Example**: Rent reminder, EUR 800/month, due on the 1st.
- User marks paid on Jan 1 → expense transaction created (EUR 800, Bills category), `due_date` advances to Feb 1, `is_paid` resets to `false`.
- Cron job on Jan 30 (`reminder_days_before = 1`) sees Feb 1 due date approaching → sends notification.
- User marks paid on Feb 1 → cycle repeats.

**Overdue catch-up example**: Rent reminder due Jan 1, user doesn't mark paid until March 15.
- User marks paid → one expense transaction created (EUR 800, today's date). `due_date` advances past Feb 1 and Mar 1 (both in the past) and lands on **Apr 1** (next future date). `is_paid` resets to `false`. The missed January and February payments are not auto-created — if the user needs those, they add transactions manually.

**Overdue handling**: If `due_date` is in the past and `is_paid = false`, the reminder appears in the "Overdue" group. The cron job does not repeatedly nag — it only notifies once per cycle (controlled by `last_notified_at`). The user can mark it paid at any time, which advances to the next future cycle as described above.

### Email Delivery & Scheduling

**Email via Resend**: Handles deliverability, SPF/DKIM, and bounce processing via a simple API (`resend.emails.send()`). Free tier: 3,000 emails/month.

**Scheduling via Vercel Cron**: Schedule defined in `vercel.json` (`{ "crons": [{ "path": "/api/cron/reminders", "schedule": "0 8 * * *" }] }`). Vercel sends an HTTP GET with `CRON_SECRET` header at the scheduled time. The route handler validates the secret and runs the notification logic.

**Cron job implementation** (`/api/cron/reminders`):
- Protected by `CRON_SECRET` header validation - rejects requests without a valid secret to prevent unauthorized invocation.
- For each user, it checks their `notification_preferences` and respects **per-channel** toggles: if a notification type has `email: true`, send via Resend; if `in_app: true`, insert into the `notifications` table. Both, one, or neither — each channel is independent.
- **Reminders**: queries reminders where `due_date - reminder_days_before = today` and `last_notified_at` is null or older than the current cycle. Sends email and/or creates in-app notification based on the user's `reminder_due_dates` channel preferences. Updates `reminders.last_notified_at`.
- **Budget alerts** (per-category): queries expense-type transactions for the current month grouped by category. For each category with a `budget_limit`, checks if spending has crossed 80% or 100%. Dedup via `categories.budget_80_notified_at` / `budget_100_notified_at` — only sends if null or from a previous month; updates to `now()` after sending. Resets naturally each month. Example: Food reaches 80% → "Food budget: 80% reached (EUR 160 of EUR 200)". Later Subscriptions hits 100% → separate alert.
- Email template: Clean, minimal HTML matching the app's earthy aesthetic. Includes a deep link back to the app. One-click unsubscribe link in footer (sets `email: false` for that notification type — in-app stays unaffected).

### In-App Notifications

In addition to email, all notifications are stored in the `notifications` table (see migration `016_notifications.sql` in [Database & Auth](02-database-and-auth.md#database-schema-supabase)) and surfaced in-app:

- **Notification bell** (`NotificationBell` component): Displayed in the top nav bar (both mobile and desktop). Shows an unread count badge. Clicking opens a dropdown panel with recent notifications, sorted newest-first. Each notification shows: icon (based on type), title, message, and relative timestamp ("2h ago"). Clicking a notification marks it as read and navigates to the relevant page (e.g., budget alert → `/dashboard/budget`, reminder due → `/dashboard/reminders`).
- **Mark as read**: Individual notifications can be marked as read by clicking them. "Mark all as read" action at the top of the dropdown.
- **Upcoming bills badge**: The Reminders nav item shows a small badge count of bills due within 3 days (separate from the notification bell).
- **Budget warning banner**: A subtle banner at the top of the dashboard when any category's spending exceeds 80% of its budget. Dismissible per session.
- **Notification types stored**:
  - `budget_80` - Category reached 80% of budget. Data: `{ category_id, category_name, spent, limit }`.
  - `budget_100` - Category reached 100% of budget. Data: `{ category_id, category_name, spent, limit }`.
  - `reminder_due` - Bill/reminder is due soon. Data: `{ reminder_id, title, due_date, amount }`.
  - `debt_settled` - A debt has been fully settled. Data: `{ debt_id, counterparty }`.
- Notifications older than 90 days can be pruned in a future cleanup job, but no auto-deletion for v1.

---

## Billing & Plan Limits

### Public Tiers (shown on landing page and settings)

| Feature              | Free               | Pro (EUR 2.99/mo)     |
| -------------------- | ------------------ | --------------------- |
| Transactions         | 40/month           | Unlimited             |
| Budgets & Reminders  | Full access        | Full access           |
| Debts                | Full access        | Full access           |
| AI Credits           | 15/day             | Unlimited             |
| Telegram Bot         | No                 | Yes                   |
| Voice Input          | Yes                | Yes                   |
| Banner Presets       | Colors & gradients | Full library (images) |
| Email Reminders      | Yes                | Yes                   |

### Hidden Pro Limits (not displayed publicly, abuse prevention only)

Pro is "unlimited" from the user's perspective, but reasonable hard caps exist to prevent abuse and runaway AI costs:

| Resource                 | Pro Hard Cap     |
| ------------------------ | ---------------- |
| Transactions per month   | 2,000            |
| AI credits per day       | 500              |
| Attachments per month    | 200              |
| Storage per user         | 2 GB             |
| AI memories (rules)      | 50               |

These limits should never be hit by normal usage. If a user hits them, show a friendly message ("You've been busy! Daily limit reached, try again tomorrow.") - not an upgrade CTA.

### Limits Configuration (`lib/config/limits.ts`)

All plan limits live in a single typed config file, version-controlled, importable anywhere:

```typescript
export const PLAN_LIMITS = {
  free: {
    transactions_per_month: 40,
    ai_credits_per_day: 15,
    telegram_enabled: false,
    banner_images_enabled: true,
    attachments_per_month: 10,
    storage_mb: 100,
    ai_memories_max: 20,
  },
  pro: {
    transactions_per_month: 2000,
    ai_credits_per_day: 500,
    telegram_enabled: true,
    banner_images_enabled: true,
    attachments_per_month: 200,
    storage_mb: 2048,
    ai_memories_max: 50,
  },
} as const;
```

- **Why a config file, not DB**: Limits change rarely. A code change + deploy is fine. No DB query on every gated action. Fully typed - IDE autocomplete and compile-time safety.
- **Override via env vars**: Optional `LIMIT_FREE_TRANSACTIONS_PER_MONTH` etc. for quick tweaks without a deploy. Config file reads env vars with fallback to defaults.

### Enforcement Mechanism

Every gated action checks limits **server-side** before executing. Never trust the client.

| Check                    | How                                                        |
| ------------------------ | ---------------------------------------------------------- |
| Transactions per month   | `SELECT COUNT(*) FROM transactions WHERE user_id = ? AND date >= first_of_month`. Checked in the transaction creation Server Action. |
| AI credits per day       | `daily_usage` table: `UPSERT ... SET credits_used = credits_used + 1 WHERE credits_used < limit`. Atomic - no race conditions. Single check for all AI features. |
| Attachments per month    | `SELECT COUNT(*) FROM attachments WHERE user_id = ? AND created_at >= first_of_month`. |
| Storage per user         | `SELECT SUM(file_size) FROM attachments WHERE user_id = ?`. Checked before upload. |
| Feature flags (Telegram, banner images) | Simple boolean check against `PLAN_LIMITS[tier].telegram_enabled` etc. |

**When a limit is hit**:
- Free tier: Show a clear but non-aggressive upgrade prompt. "You've used 40/40 transactions this month. Upgrade to Pro for unlimited." Include a CTA button to the pricing page.
- Pro tier (hidden limits): Friendly message with no upgrade CTA. "Daily limit reached - try again tomorrow."
- Telegram bot: Bot responds with a text message explaining the limit.

### Stripe Implementation
- Stripe Checkout for subscription creation (EUR currency), with `allow_promotion_codes: true`
- Stripe Customer Portal for plan management (upgrade, cancel, payment methods)
- Stripe Webhooks to sync subscription status to `subscriptions` table
- `subscription_tier` on `profiles` is the source of truth for feature gating (updated via webhook)

### Coupon / Promo Codes
- Handled entirely via **Stripe's built-in Coupons + Promotion Codes** - no custom tables or validation logic.
- Admins create coupons in the Stripe Dashboard (e.g., 100% off forever, or 100% off for 3 months).
- Each coupon gets one or more customer-facing promotion codes (e.g., `LAUNCH2026`, `FRIEND50`).
- Stripe Checkout natively renders a promo code input field when `allow_promotion_codes` is enabled.
- Stripe handles validation, expiry, max redemptions, single-use vs multi-use.
- Time-limited coupons (e.g., "3 months free Pro") auto-start charging when they expire - no custom logic needed.
- The subscription lifecycle (renewal, cancellation, plan changes) works identically for discounted and full-price users.

---

## Data Export & Account Deletion

### Transaction Export

Users can export their transaction data from `/dashboard/settings` -> "Your Data" section.

- **Format**: CSV with columns: `date`, `type` (expense/income), `amount`, `category`, `description`, `source`. The `source` column indicates how the transaction was created: `web` (added via the web app form), `telegram` (added via the Telegram bot), or `voice` (added via in-app voice input). This helps users understand their input patterns and verify data provenance.
- **Endpoint**: `GET /api/export?format=csv` - server-side generation, streams the file as a download.
- **Date filter**: Optional `from` and `to` query parameters (ISO date strings). `GET /api/export?format=csv&from=2026-01-01&to=2026-01-31` exports January only. If omitted, exports all transactions. The settings UI provides a simple date range picker (preset options: "This month", "Last 3 months", "This year", "All time") plus custom date inputs.
- **Type filter**: Optional `type` query parameter (`expense` or `income`). If omitted, exports both.

### Account Deletion

Users can delete their account from `/dashboard/settings` -> "Danger Zone" section.

- **UI**: Red "Delete Account" button, visually separated from other settings.
- **Confirmation**: Modal with explicit warning: "This will permanently delete your account and all your data. This action is irreversible." User must type "DELETE" to confirm.
- **Process**:
  1. Cancel active Stripe subscription (if any) via Stripe API.
  2. Delete all user data from Supabase: transactions, categories, reminders, debts, debt_payments, notifications, attachments (DB rows + Storage files), ai_memories, telegram_sessions, daily_usage, subscriptions.
  3. Delete the profile row.
  4. Delete the Supabase Auth user via admin client.
  5. Sign out and redirect to landing page with a confirmation toast.
- **Implementation**: Server Action using the admin Supabase client (service role) to cascade all deletions. Wrapped in a transaction where possible.
