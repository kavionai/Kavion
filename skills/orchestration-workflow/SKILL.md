---
name: orchestration-workflow
description: Use this skill for the main Kavion workflow that classifies a task, chooses Express or Standard execution, delegates to specialist agents, applies gates, and returns a final report.
---
# Orchestration workflow

Use this skill for `/kavion:orchestrate` and for any request that does not fit a
more specific team command.

## Complexity classification

Use Express when all are true:

- The task is small and localized.
- Requirements are clear.
- One implementation specialist is likely enough.
- Risk is low.

Use Standard when any are true:

- Requirements are ambiguous.
- More than one specialist may be needed.
- Architecture, security, database, or GitHub flow is involved.
- The task spans multiple files or systems.
- The user asks for a serious feature, refactor, or issue fix.

## Express workflow

1. Understand the task.
2. Use `codebase_investigator` only if repo context is needed.
3. Delegate to one implementation specialist.
4. Run focused QA or review.
5. Return final summary.

## Standard workflow

1. Requirements: clarify scope and acceptance criteria.
2. Design: define technical approach when needed.
3. Plan: break work into ordered steps and agent handoffs.
4. Execute: delegate implementation to specialists.
5. Verify: run QA, security, and review gates.
6. Complete: update GitHub/docs/memory and report.

## Guardrails

- Do not call every agent by default.
- Do not edit before understanding impact.
- Do not skip review for non-trivial code changes.
- State why a normal phase is skipped.

## Output

Return:

- Workflow selected
- Agents used
- Phase status
- Files changed
- Verification
- Risks
- Next step
