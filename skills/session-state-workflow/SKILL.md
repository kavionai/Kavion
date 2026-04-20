---
name: session-state-workflow
description: Use this skill to create, update, resume, inspect, or archive ForgeKit task session files under .gemini/forgekit/sessions, plans, and reports.
---
# Session state workflow

Use this skill for long-running tasks or any workflow that may span multiple
Gemini sessions.

## Directory layout

Use this project-local structure:

```text
.gemini/forgekit/
  sessions/
    active/
    archive/
  plans/
  reports/
```

## Session file fields

Each active session should record:

- Session ID
- Task
- Branch
- GitHub issue or PR
- Workflow mode: Express or Standard
- Current phase
- Agents used
- Files touched
- Verification run
- Blockers
- Next step
- Last updated

## Workflow

1. Create a session before medium or complex execution.
2. Update the session after each meaningful phase.
3. Keep session state concise.
4. Store detailed plans in `.gemini/forgekit/plans/`.
5. Store review or QA reports in `.gemini/forgekit/reports/`.
6. Archive completed sessions instead of deleting them.
7. If the runtime is read-only or approval for writes is unavailable, continue the task and report session-state updates as deferred instead of blocking progress.

## Output

Return:

- Session ID
- Current phase
- Status
- Next step
- Files updated
