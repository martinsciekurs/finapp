---
description: PR review — parallel agents for quality, security, and cleanup
---

Review the current branch's changes. Base defaults to main. Override: `/review <branch>`

**Changed files:**
!`B=$ARGUMENTS; git diff "${B:-main}"...HEAD --stat`

**Commits:**
!`B=$ARGUMENTS; git log "${B:-main}"...HEAD --oneline`

**Migrations changed:**
!`B=$ARGUMENTS; git diff "${B:-main}"...HEAD --name-only -- 'supabase/migrations/'`

**Tests changed:**
!`B=$ARGUMENTS; git diff "${B:-main}"...HEAD --name-only -- 'supabase/tests/' '**/*.test.ts' '**/*.test.tsx' 'e2e/'`

---

Dispatch to these 3 subagents IN PARALLEL via the Task tool. Pass each the changed file list and tell them to read those files:

1. **review-quality** — code quality and dead-end code
2. **review-security** — security, SQL integrity, DB test coverage. Highlight which migrations changed and whether matching tests exist
3. **review-cleanup** — redundancy and simplification

After all complete, compile a single report:

## Code Quality
<review-quality findings>

## Security & Data Integrity
<review-security findings>

## Simplification
<review-cleanup findings>

## Verdict
APPROVE | REQUEST CHANGES | NEEDS DISCUSSION + 1-2 sentence justification

Rules: only real issues, every finding has file:line, empty sections say "No issues found."
