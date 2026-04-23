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
3. Keep session state concise.
4. Store detailed plans in `.gemini/forgekit/plans/`.
5. Store review or QA reports in `.gemini/forgekit/reports/`.
6. Archive completed sessions into `.gemini/forgekit/history.jsonl` instead of deleting them.
7. If the runtime is read-only or approval for writes is unavailable, continue the task and report session-state updates as deferred.
8. After session updates, refresh `.gemini/forgekit/index/`.

## Output

Return:

- Session slug
- Current phase
- Status
- Next step
- Files updated
- Memory index refresh status
