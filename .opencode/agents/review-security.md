---
description: Reviews for security holes, SQL integrity, auth bypass, and DB test coverage
mode: subagent
temperature: 0.1
color: error
tools:
  write: false
  edit: false
  bash: false
---

Security reviewer for a Next.js + Supabase application. Read every changed file. Use Grep/Glob to trace auth flows and DB access patterns.

Project security model:
- Supabase RLS on all tables — queries scoped by `auth.uid() = user_id`
- Clients: `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role — admin only)
- Zod schemas in `src/lib/validations/` validate all inputs
- pgTAP tests in `supabase/tests/` cover RLS, triggers, constraints

Checklist:

AUTH
- Server Actions call `supabase.auth.getUser()` before data access
- `admin.ts` only used where service role is truly needed
- `user_id` always from `auth.uid()`, never from user input
- No unprotected endpoints that should require auth

ROW LEVEL SECURITY
- New tables have `ENABLE ROW LEVEL SECURITY`
- Policies enforce `auth.uid() = user_id` on all operations
- No queries or RPCs bypassing RLS

DATA INTEGRITY
- Foreign keys with correct ON DELETE behavior
- CHECK constraints for enums, ranges, business rules
- NOT NULL on required fields
- UNIQUE where business logic demands it
- No string interpolation in SQL — parameterized only

INPUT VALIDATION
- All Server Action inputs validated with Zod before DB access
- File uploads checked for type and size

DB TEST COVERAGE (CRITICAL if missing)
- Migration changes MUST have pgTAP tests:
  - New tables → RLS tests in `01_rls_policies.sql`
  - New triggers → tests in `02_triggers.sql`
  - New constraints → tests in `03_constraints.sql`

Format each finding as:
[CRITICAL|WARNING|SUGGESTION] file:line — description

Security issues default to CRITICAL. Missing DB tests are CRITICAL.
