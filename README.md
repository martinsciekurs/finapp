# FinApp — Personal Finance Dashboard

Track expenses, manage budgets, and stay on top of your finances. Built with Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, and Supabase.

## Prerequisites

- Node.js 20+
- Docker (for local Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started): `brew install supabase`

## Setup

```bash
npm install
cp .env.local.example .env.local
supabase start
```

`supabase start` prints a table of credentials. Copy these into `.env.local`:

| Supabase output | `.env.local` variable |
|-----------------|-----------------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| Publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Secret key | `SUPABASE_SERVICE_ROLE_KEY` |

Then start the dev server:

```bash
npm run dev             # http://localhost:3200
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run test:watch` | Unit tests in watch mode |
| `npm run test:coverage` | Unit tests with coverage |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npx playwright test --headed` | E2E in headful (visible browser) mode |
| `npx playwright test --ui` | E2E interactive UI debugger |
| `supabase test db` | Database tests (pgTAP) |
| `supabase start` | Start local Supabase |
| `supabase stop` | Stop local Supabase |
| `supabase db reset` | Reset DB and re-run migrations |

## Project Structure

```
src/app/           Pages and layouts (App Router)
src/components/    UI components (shadcn/ui in ui/)
src/lib/           Config, Supabase clients, validations, utils
supabase/          Config + 16 SQL migrations
e2e/               Playwright E2E tests
docs/              Implementation plan + progress tracking
```

See [CLAUDE.md](CLAUDE.md) for full architecture and conventions.
