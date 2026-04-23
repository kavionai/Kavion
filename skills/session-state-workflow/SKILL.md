---
name: session-state-workflow
description: Use this skill to create, update, resume, inspect, or archive ForgeKit 2 task session state in session.json, history.jsonl, plans, and reports.
---
# Session state workflow

Use this skill for long-running tasks or any workflow that may span multiple Gemini sessions.

## Directory layout

Use this project-local structure:

```text
.gemini/forgekit/
  CURRENT.md
  session.json
  history.jsonl
  plans/
  reports/
  notes/
  index/
```

## Session state fields

The live session should record:

- Task
- Slug
- Workflow mode
- Current phase
- Status
- Agents used
- Files touched
- Verification
- Blockers
- Next step
- Gate cache
- Updated timestamp

## Workflow

1. Create or update `session.json` before medium or complex execution.
2. Update the session after each meaningful phase.
3. Record the current active agent or responsible specialist when the phase changes.
4. Do not leave the phase at `planning` once implementation has started.
5. Keep session state concise.
6. Store detailed plans in `.gemini/forgekit/plans/`.
7. Store review or QA reports in `.gemini/forgekit/reports/`.
8. Store reusable investigation notes in `.gemini/forgekit/notes/` when needed.
9. Archive completed sessions into `.gemini/forgekit/history.jsonl` instead of deleting them.
10. If the runtime is read-only or approval for writes is unavailable, continue the task and report session-state updates as deferred.
11. After session updates, refresh `.gemini/forgekit/index/`.

## Output

Return:

- Session slug
- Current phase
- Status
- Next step
- Files updated
- Memory index refresh status
