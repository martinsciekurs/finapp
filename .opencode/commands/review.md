---
description: PR review + auto-fix — parallel agents for quality, security, and cleanup
---

Review the current branch's changes. Base defaults to origin/main. Override: `/review <branch>`

!`B=$ARGUMENTS; REF="${B:-origin/main}"; REMOTE="${REF%%/*}"; BRANCH="${REF#*/}"; git fetch "$REMOTE" "$BRANCH"`

**Changed files:**
!`B=$ARGUMENTS; git diff "${B:-origin/main}"...HEAD --stat`

**Commits:**
!`B=$ARGUMENTS; git log "${B:-origin/main}"...HEAD --oneline`

**Migrations changed:**
!`B=$ARGUMENTS; git diff "${B:-origin/main}"...HEAD --name-only -- 'supabase/migrations/'`

**Tests changed:**
!`B=$ARGUMENTS; git diff "${B:-origin/main}"...HEAD --name-only -- 'supabase/tests/' '**/*.test.ts' '**/*.test.tsx' '**/*.spec.ts' '**/*.spec.tsx' 'e2e/'`

---

## Phase 1: Review

IMPORTANT: You MUST use the Task tool to launch exactly 3 subagents IN PARALLEL (all 3 in a single response). Do NOT review the code yourself. Delegate to:

1. Task(subagent_type="review-quality") — pass it the changed file list. It reviews code quality, dead-end paths, and unused/dead code detection (authoritative owner of unused-code findings).
2. Task(subagent_type="review-security") — pass it the changed file list AND specifically which migrations and test files changed (or didn't). It reviews security, SQL integrity, and DB test coverage.
3. Task(subagent_type="review-cleanup") — pass it the changed file list. It reviews redundancy and simplification opportunities only (not unused/dead code — that belongs to review-quality). Avoid duplicate findings.

Include the full changed file list in each Task prompt so the subagent knows what to read.

Wait for all 3 to complete, then compile their findings:

### Code Quality
<review-quality findings>

### Security & Data Integrity
<review-security findings>

### Simplification
<review-cleanup findings>

---

## Phase 2: Fix

### Low-risk — auto-apply

Apply these directly with Edit/Write tools — no confirmation needed:

- Unused imports, variables, dead code — remove
- Missing return types — add them
- Hardcoded colors — replace with semantic tokens
- Nested ternaries — refactor to early returns
- Unnecessary `"use client"` — remove directive
- Empty catch blocks — add error handling
- Wrapper functions adding no value — inline
- Duplicated logic — extract to shared util in `src/lib/`
- Missing Zod validation scaffolding on Server Action inputs — add schema

### High-risk — require confirmation

Present these to the user and wait for explicit approval before applying:

- Missing auth checks — add `supabase.auth.getUser()` guard
- Missing RLS policies — write the SQL migration
- Missing FK/CHECK/UNIQUE constraints — write migration
- Missing pgTAP tests — write them following patterns in `supabase/tests/`
- Repository-wide constraint changes

---

## Phase 3: Report

After fixing, produce the final report:

### Fixes Applied
<list each fix with file:line and what changed>

### Verdict
APPROVE | NEEDS DISCUSSION + 1-2 sentence justification

Rules: only real issues, every finding has file:line, empty sections say "No issues found."
