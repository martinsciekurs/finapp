# Deployment Guide

Step-by-step guide to deploy FinApp publicly on Vercel + Supabase Cloud.

---

## Prerequisites

- Node.js >= 20.11.0
- Supabase CLI installed (`npm i -g supabase`)
- Vercel account ([vercel.com](https://vercel.com))
- Supabase Cloud account ([supabase.com](https://supabase.com))

---

## 1. Create a Supabase Cloud Project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Pick a region close to your users and set a strong database password.
3. Once created, go to **Settings > API** and note:
   - Project URL (`NEXT_PUBLIC_SUPABASE_URL`)
   - Anon public key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - Service role key (`SUPABASE_SERVICE_ROLE_KEY`)

## 2. Push Database Migrations

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

> Your **project ref** is the subdomain in your Supabase project URL (`https://<project-ref>.supabase.co`). Find it in the Supabase dashboard under **Settings > General > Reference ID**.

This applies all 16 migration files (schema, RLS policies, triggers).

After pushing, regenerate TypeScript types:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## 3. Verify the Build Locally

```bash
npm run build
npm run lint
npm test
```

All three must pass. Vercel runs `npm run build` during deployment — a local failure means a deploy failure.

## 4. Deploy to Vercel

**Option A — CLI:**

```bash
npm i -g vercel
vercel
```

**Option B — Dashboard:**

Connect your GitHub repo at [vercel.com/new](https://vercel.com/new). Vercel auto-detects Next.js and deploys on every push.

No `vercel.json` is needed — zero-config defaults work.

## 5. Set Environment Variables

In the Vercel dashboard, go to **Settings > Environment Variables** and add:

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Server-only, mark as sensitive |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Your production URL |

These four are the only variables needed for the current phase. Future integrations (Stripe, AI, Telegram, Resend, Cron) will require additional variables — see [05-infrastructure.md](plan/05-infrastructure.md#environment-variables) for the full list.

## 6. Custom Domain (Optional)

1. In Vercel dashboard: **Settings > Domains > Add**.
2. Update your DNS (CNAME or A record) as instructed by Vercel.
3. HTTPS is provisioned automatically.
4. Update `NEXT_PUBLIC_APP_URL` to match the new domain.

---

## Post-Deploy Verification

After the first successful deploy, verify:

- [ ] **Auth flow** — Sign up, log in, and confirm the onboarding redirect works.
- [ ] **RLS** — Create data with one user, confirm it's invisible to another.
- [ ] **PWA manifest** — Visit `/manifest.webmanifest` and confirm it loads. Check icons render.
- [ ] **Theme** — Toggle dark/light mode. Confirm styles apply correctly.
- [ ] **Middleware** — Visit `/dashboard` while logged out and confirm redirect to `/auth/login`.
- [ ] **`NEXT_PUBLIC_APP_URL`** — Check `<meta>` tags in page source match your production URL.

---

## Future Phase Requirements

These are **not needed now** but will be required as features are implemented:

| Phase | Service | Variables to Add |
|---|---|---|
| 3 | Google Gemini (AI) | `GOOGLE_GENERATIVE_AI_API_KEY` |
| 3 | Telegram Bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` |
| 4 | Stripe Billing | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| 4 | Resend Email | `RESEND_API_KEY` |
| 4 | Cron Jobs | `CRON_SECRET` + add `crons` config to `vercel.json` |

When adding Supabase Storage images to the app, also add `images.remotePatterns` in `next.config.ts` for your Supabase project URL.
