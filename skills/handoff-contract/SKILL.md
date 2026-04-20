---
name: handoff-contract
description: Use this skill whenever a ForgeKit specialist agent reports work back to the main coordinator, so all handoffs include status, files, verification, risks, and downstream context.
---
# Handoff contract

Use this skill for all specialist-to-coordinator reports.

## Required report

Return this structure:

```text
## Task Report

Status:
Files changed:
What changed:
Tests/checks run:
Risks:
Next recommended step:

## Downstream Context

For QA:
For security:
For code review:
For GitHub/PR:
For docs/memory:
```

## Rules

- Be concise.
- State when no files were changed.
- Do not claim tests passed unless they were run.
- Separate confirmed facts from assumptions.
- Include blockers explicitly.
