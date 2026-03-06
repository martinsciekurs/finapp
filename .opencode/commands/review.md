---
description: PR review + auto-fix — parallel agents for quality, security, and cleanup
---

Review the current branch's changes. Base defaults to `origin/main`. Override: `/review <branch>` or `/review <remote>/<branch>`

!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then if [ "$R" = "$P" ]; then git fetch "$P"; else git fetch "$P" "${R#*/}"; fi; else git fetch origin "$R"; fi`

**Changed files (committed + staged + unstaged + untracked):**
!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then BASE="$R"; else BASE="origin/$R"; fi; { git diff --name-only "$BASE"...HEAD 2>/dev/null; git diff --name-only --cached; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u`

**Untracked files (subset of changed files):**
!`git ls-files --others --exclude-standard | sort -u`

**Commits:**
!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then BASE="$R"; else BASE="origin/$R"; fi; git log "$BASE"..HEAD --oneline`

**Diff summary (committed vs base):**
!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then BASE="$R"; else BASE="origin/$R"; fi; git diff --stat "$BASE"...HEAD`

**Diff summary (staged + unstaged):**
!`{ git diff --stat --cached; git diff --stat; }`

**Migrations changed:**
!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then BASE="$R"; else BASE="origin/$R"; fi; { git diff --name-only "$BASE"...HEAD -- 'supabase/migrations/' 2>/dev/null; git diff --name-only --cached -- 'supabase/migrations/'; git diff --name-only -- 'supabase/migrations/'; git ls-files --others --exclude-standard -- 'supabase/migrations/'; } | sort -u`

**Tests changed:**
!`R="${ARGUMENTS:-origin/main}"; P="${R%%/*}"; if git remote | grep -Fxq "$P"; then BASE="$R"; else BASE="origin/$R"; fi; { git diff --name-only "$BASE"...HEAD 2>/dev/null; git diff --name-only --cached; git diff --name-only; git ls-files --others --exclude-standard; } | sort -u | grep -E -e '^supabase/tests/' -e '^e2e/' -e '\.test\.ts$' -e '\.test\.tsx$' -e '\.spec\.ts$' -e '\.spec\.tsx$' || true`

---

## Phase 1: Review

IMPORTANT: You MUST use the Task tool to launch exactly 3 subagents IN PARALLEL (all 3 in a single response). Do NOT review the code yourself. Delegate to:

1. Task(subagent_type="review-quality") — pass it the changed file list. It reviews code quality, dead-end paths, and unused/dead code detection (authoritative owner of unused-code findings).
2. Task(subagent_type="review-security") — pass it the changed file list AND specifically which migrations and test files changed (or didn't). It reviews security, SQL integrity, and DB test coverage.
3. Task(subagent_type="review-cleanup") — pass it the changed file list. It reviews redundancy and simplification opportunities only (not unused/dead code — that belongs to review-quality). Avoid duplicate findings.

Include the full changed file list from the "Changed files" section in each Task prompt so the subagent knows what to read (this includes untracked files).

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
