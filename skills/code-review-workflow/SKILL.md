---
name: code-review-workflow
description: Use this skill to review code changes, local diffs, pull requests, bug fixes, refactors, and feature implementations for correctness, regressions, missing tests, and maintainability.
---
# Code review workflow

Use this skill before finalizing code changes.

## Workflow

1. Inspect the diff and touched files.
2. Understand the intended behavior and affected contracts.
3. Check likely edge cases and regression paths.
4. Check whether tests cover the changed behavior.
5. Prioritize real bugs over style preferences.
6. Return concise findings ordered by severity.
7. For Standard work, write a code review report under `.kavion/reports/`.
8. Prefer MCP tool `kavion_report_create` when available.
9. Review reports summarize findings and readiness only. Do not use them for execution-step tracking.

## Finding criteria

Report a finding only when it can cause:

- Incorrect behavior
- Security or data risk
- Regression
- Missing necessary test coverage
- Maintainability problem with clear future cost

## Output

Return:

- Findings ordered by severity
- Evidence
- Suggested fix
- Test gaps
- Overall readiness
- Report file path, when persisted
