# Infrastructure

## Tech Stack

The following is the suggested starting stack. It is not rigid - popular, well-maintained libraries should be used where appropriate. Specific packages may be added, swapped, or removed during implementation as needs become clearer.

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Framework        | Next.js 16 (App Router, Server Components)       |
| Language         | TypeScript (strict mode)                         |
| Styling          | Tailwind CSS 4 + shadcn/ui                       |
| Database         | Supabase (Postgres + RLS)                        |
| Auth             | Supabase Auth (email/password)                   |
| AI               | Vercel AI SDK (provider-agnostic, start Gemini)  |
| Validation       | Zod (shared schemas for forms, API, AI output)   |
| Forms            | react-hook-form + @hookform/resolvers/zod        |
| Charts           | Recharts                                         |
| Animations       | Framer Motion                                    |
| Icons            | lucide-react                                     |
| Dates            | date-fns                                         |
| Theming          | next-themes                                      |
| Toasts           | Sonner                                           |
| Billing          | Stripe (Checkout + Customer Portal)              |
| Email            | Resend (transactional emails for reminders)      |
| Bot              | Telegram Bot API (Grammy)                        |
| Testing          | Vitest + React Testing Library + Playwright      |
| Deployment       | Vercel                                           |
| PWA              | next-pwa (or `@serwist/next`)                    |

---

## PWA Configuration

The app is installable as a PWA so users can add it to their phone's home screen for quick transaction entry.

### Manifest
- `app/manifest.ts` (dynamic Next.js manifest) - App name, theme color (`#2d4a3e`), background color (`#fdf6ee`), display mode `standalone`, icons in multiple sizes.

### Service Worker
- Use `@serwist/next` for service worker generation.
- **Cache strategy**: Network-first for API calls (always fresh data), cache-first for static assets (images, fonts, JS/CSS bundles).
- Offline support is not a priority for v1 (data is live from Supabase), but the PWA shell (nav, layout) should render offline with a "You're offline" message.

### Install Prompt
- Rely on the browser's native PWA install prompt (Chrome, Edge, etc. show this automatically when criteria are met). No custom install banner for v1 - keeps it simple and non-intrusive.

### App Icons
- 192x192 and 512x512 PNG icons matching the app's branding (dark olive primary color, simple finance-related mark).
- Apple touch icon for iOS.

---

## Environment Variables

All environment variables required by the application. Store in `.env.local` for development (never committed). Set in the Vercel project settings for production.

| Variable                          | Required | Description                                          |
| --------------------------------- | -------- | ---------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`        | Yes      | Supabase project URL (public, safe for client)       |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`   | Yes      | Supabase anon/public key (respects RLS)              |
| `SUPABASE_SERVICE_ROLE_KEY`       | Yes      | Service role key — bypasses RLS. Server-only.        |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes   | Stripe publishable key (public, safe for client)     |
| `STRIPE_SECRET_KEY`               | Yes      | Stripe secret key. Server-only.                      |
| `STRIPE_WEBHOOK_SECRET`           | Yes      | Stripe webhook signing secret (`whsec_...`)          |
| `GOOGLE_GENERATIVE_AI_API_KEY`    | Yes      | Gemini API key for Vercel AI SDK                     |
| `RESEND_API_KEY`                  | Yes      | Resend API key for transactional emails              |
| `CRON_SECRET`                     | Yes      | Secret for Vercel Cron job authentication            |
| `TELEGRAM_BOT_TOKEN`             | Yes      | Telegram bot token from @BotFather                   |
| `TELEGRAM_WEBHOOK_SECRET`        | Yes      | Secret token for Telegram webhook validation         |
| `NEXT_PUBLIC_APP_URL`            | Yes      | Canonical app URL (e.g., `https://app.example.com`). Used for deep links in emails and Telegram. |

Optional limit overrides (see [Billing & Plan Limits](04-features.md#billing--plan-limits)):

| Variable                               | Default   | Description                          |
| -------------------------------------- | --------- | ------------------------------------ |
| `LIMIT_FREE_TRANSACTIONS_PER_MONTH`    | 40        | Override free tier transaction limit  |
| `LIMIT_FREE_AI_CREDITS_PER_DAY`       | 15        | Override free tier AI credit limit    |
| `LIMIT_PRO_AI_CREDITS_PER_DAY`        | 500       | Override pro tier AI credit limit     |

---

## Technical Notes

- **State Management**: React state + Server Components. No Redux/Zustand. Server Actions for mutations.
- **Performance**: Optimistic updates for inline editing. Streaming for AI responses. ISR for landing page.
- **IDs**: All tables use UUIDv7 (time-sortable). Never sequential integers.
- **Timestamps**: All tables have `created_at` + `updated_at`, auto-managed via Postgres trigger.
- **Currency**: Display label only. All amounts stored as plain numbers. No conversion logic.
- **File Storage**: Supabase Storage bucket `attachments`, keyed by `{user_id}/{record_type}/{record_id}/{filename}`. Max 5MB per file, max 3 per record. Accepted types: JPEG, PNG, PDF. RLS on storage: users can only access their own `user_id/` prefix. Generic `attachments` table supports transactions, debts, and reminders.
- **Security**: All AI endpoints validate session + check credit limits server-side. AI text inputs capped at 100 words / 1000 chars. Voice recordings capped at 60 seconds, audio discarded after transcription. File uploads capped at 5MB, validated server-side. Telegram webhook validates Telegram's secret token. Stripe webhook validates signature. Cron endpoints validate `CRON_SECRET` header.
- **Rate Limiting**: Unified AI credit system via `daily_usage` table in Supabase with `(user_id, date)` unique constraint.
- **Error Handling**: Three layers — (1) `app/error.tsx` global error boundary catches unexpected errors with a "Something went wrong" page and retry button; (2) `app/dashboard/error.tsx` catches dashboard-specific errors without losing the shell/nav; (3) `app/not-found.tsx` custom 404 with a friendly message and link back to dashboard. All Server Actions return `{ success, data?, error? }` — never throw to the client.
- **Validation**: Single source of truth Zod schemas in `lib/validations/`. Used by forms (client), Server Actions (server), and AI structured outputs. No duplicate validation logic.
- **AI Philosophy**: AI is a helper, not autopilot. All AI-generated write actions require user confirmation before writing to DB. AI never silently modifies data.

### Pagination & Search

- **Transactions**: Cursor-based pagination (cursor = last item's UUIDv7 `id`), 20 items per page.
- **Reminders, Debts**: No pagination for v1 — lists are small enough (<50 reminders, <20 debts).
- **Admin user list**: Offset-based pagination, 50 per page.
- **Notifications**: Latest 20 in dropdown.
- **Transaction search**: Server-side `ILIKE '%query%'` on description, combined with type filter tabs.

### Supabase Type Generation

Run `supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts` to generate TypeScript types from the live schema. The generated file is committed to the repo. Re-run after every migration. The Supabase client is typed: `createClient<Database>(...)` — gives autocomplete and type safety for all queries.

### SEO & Metadata

- Landing page (`/`): Full SEO — `<title>`, `<meta description>`, Open Graph tags, Twitter card. Defined in `app/page.tsx` metadata export.
- Auth pages: basic `<title>` only, `noindex` meta tag (don't index login/signup).
- Dashboard pages: `noindex` (behind auth, not public). Basic `<title>` per page for tab identification ("Transactions | AppName").

### Supabase Deployment
Supabase Cloud (managed). For local development, the Supabase CLI (`supabase start`) spins up the full stack via Docker automatically.
