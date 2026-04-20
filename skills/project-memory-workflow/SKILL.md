---
name: project-memory-workflow
description: Use this skill to initialize, update, prune, or archive project memory files such as GEMINI.md, .gemini/context/current-work.md, decisions.md, commands.md, testing.md, and github.md.
---
# Project memory workflow

Use this skill to maintain long-term project memory without wasting context.

## Memory tiers

- Hot memory: loaded by project `GEMINI.md`.
- Warm notes: read only when relevant. Located in `.gemini/notes/`.
- Cold archive: old tasks and decisions. Located in `.gemini/archive/`.

## Hot memory files

Use:

- `.gemini/context/project-brief.md`
- `.gemini/context/architecture.md`
- `.gemini/context/commands.md`
- `.gemini/context/testing.md`
- `.gemini/context/current-work.md`
- `.gemini/context/decisions.md`
- `.gemini/context/github.md`

## Workflow

1. **Intake:** Read existing hot memory before starting work.
2. **Sync:** After meaningful progress, promote relevant details from active sessions (under `.gemini/forgekit/sessions/active/`) to `current-work.md`.
3. **Decide:** Record architectural or significant technical changes in `decisions.md`.
4. **Update:** Keep `commands.md` and `testing.md` in sync with the codebase.
5. **Notes:** Store detailed research, logs, or temporary notes in `.gemini/notes/`.
6. **Maintenance:** Every few tasks, move stale `current-work.md` entries to `decisions.md` or archive them.
7. **Prune:** Move large or old files from `context/` or `notes/` to `archive/` to keep hot context small.
8. **Sanitize:** Ensure no secrets or PII are stored in memory files.

## Promotion Rules

- Promote to `current-work.md`: Active task status, next steps, and blockers. Sync these from the active session file.
- Promote to `decisions.md`: Finalized technical choices and rationale.
- Promote to `architecture.md`: Updated system diagrams or flow descriptions.
- Promote to `testing.md`: New test patterns or verification requirements.
