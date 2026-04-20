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

## Decisions

Return one of:

- `pass`: ready to finalize.
- `pass-with-risk`: acceptable but call out residual risk.
- `block`: must fix before finalizing.

## Output

Return:

- Decision
- Evidence
- Missing verification
- Blocking issues
- Recommended next step
