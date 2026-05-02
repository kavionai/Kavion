---
name: handoff-contract
description: Use this skill whenever a Kavion specialist agent reports work back to the main coordinator, so all handoffs include status, files, verification, risks, and downstream context.
---
# Handoff contract

Use this skill for all specialist-to-coordinator reports.

After preparing the handoff, persist it with `kavion_delegate` when the worker is available.
If the specialist is about to start the owned implementation step, open that ownership with `kavion_delegate` status `spawned` first.
If the work belongs to a plan step, update that step with `kavion_plan_step_update` when the step starts and when it completes.

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
- Do not claim ready for use, release-ready, or complete when QA is deferred or workflow gates block.
- Separate confirmed facts from assumptions.
- Include blockers explicitly.
- Include ship-gate decision when available.
- Record the same facts in `kavion_delegate`:
  - `status` (`spawned` before implementation, then `completed`, `failed`, or `needs_context`)
  - `agent`
  - `summary`
  - `files_changed`
  - `tests_run`
  - `risks`
  - `blockers`
  - `next_step`
  - `downstream_context`
- Match the payload to the specialist role:
  - implementation specialists must list `files_changed`
  - `database-engineer` must note migration or rollback risk
  - `qa-test-engineer` must list `tests_run`
  - `security-engineer` must include findings or residual risk
