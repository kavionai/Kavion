---
name: quality-gate
description: Use this skill before finishing or preparing a PR to check requirements, tests, security, review, docs, GitHub readiness, and project memory updates.
---
# Quality gate

Use this skill before finalizing non-trivial work.

## Gate checklist

Check:

- Requirements and acceptance criteria are satisfied.
- Correct specialist implemented the change.
- Tests were added or updated when behavior changed.
- Relevant tests, typecheck, lint, or build were run.
- Security review ran when sensitive areas were touched.
- Code review found no blocking issues.
- Docs or project memory were updated when needed.
- GitHub branch, issue, and PR state are clear.
- Workflow checkpoint passes.
- Release readiness is not claimed when QA is deferred.
- Standard work has a persisted plan under `.gemini/forgekit/plans/`.
- Standard work has QA/test and code-review reports under `.gemini/forgekit/reports/`.

## Decisions

Return one of:

- `pass`: ready to finalize.
- `pass-with-risk`: acceptable but call out residual risk.
- `block`: must fix before finalizing.

Return `block` when QA is deferred, code review is missing, sensitive work lacks
security review, unresolved blockers remain, or memory/index state is stale and
needed for handoff. Also return `block` when Standard work is missing persisted
plan or report files.

## Output

Return:

- Decision
- Evidence
- Missing verification
- Blocking issues
- Recommended next step
