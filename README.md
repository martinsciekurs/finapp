# Simplony — Personal Finance Dashboard

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

For the AI assistant panel, add a Vercel AI Gateway key to `.env.local`:

```bash
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key
# Optional:
AI_CHAT_MODEL=google/gemini-3-flash
```

For error monitoring and AI observability, add Sentry credentials to `.env.local`:

```bash
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
SENTRY_DSN=your-sentry-dsn
# Required for source map uploads in production builds:
# SENTRY_AUTH_TOKEN=your-auth-token
```

### Verify Sentry is working

1. Start the app: `npm run dev`
2. Trigger a server-side test event:

```bash
curl -i http://localhost:3200/api/sentry-test
```

3. Confirm a new issue appears in Sentry (`javascript-nextjs` project)

For a browser-side test, open DevTools console and run:

```js
throw new Error("Sentry client test error");
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
