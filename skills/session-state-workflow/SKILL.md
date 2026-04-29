---
name: session-state-workflow
description: Use this skill to create, update, resume, inspect, or archive Kavion task session state through the worker-backed session flow and its rendered views.
---
# Session state workflow

Use this skill for long-running tasks or any workflow that may span multiple Gemini sessions.

## Directory layout

Use this project-local structure:

```text
.kavion/
  CURRENT.md
  session.json
  state.db
  history/
  plans/
  reports/
  notes/
  index/
```

## Session state fields

The live session should record:

- Task
- Slug
- Current phase
- Status
- Agents used
- Files touched
- Blockers
- Next step
- Updated timestamp

## Workflow

1. Start or resume the worker-backed session before medium or complex execution.
2. Use session transitions for each meaningful phase.
3. Record the current active agent or responsible specialist when the phase changes.
4. Do not leave the phase at `plan` once implementation has started.
5. Keep session state concise.
6. Store detailed plans in `.kavion/plans/`.
7. Store only canonical QA, review, or security reports in `.kavion/reports/`.
   - Execution-step progress belongs in plan steps and delegation records, not report files.
8. Store reusable investigation notes in `.kavion/notes/` when needed.
9. Archive completed sessions into `.kavion/history/` instead of deleting them.
10. If the runtime is read-only or approval for writes is unavailable, continue the task and report session-state updates as deferred.
11. After session updates, refresh `.kavion/index/`.

## Output

Return:

- Session slug
- Current phase
- Status
- Next step
- Files updated
- Memory index refresh status
