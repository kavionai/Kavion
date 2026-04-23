# Project Instructions

This project uses ForgeKit 2 project memory.

Always read first:

@./forgekit/CURRENT.md

Read on demand only when relevant:

- `./forgekit/PROJECT.md`
- `./forgekit/DECISIONS.md`
- `./forgekit/session.json`
- `./forgekit/plans/`
- `./forgekit/reports/`
- `./forgekit/notes/`

Rules:

1. Keep hot memory small.
2. Do not read `PROJECT.md` or `DECISIONS.md` unless the task needs them.
3. Update `CURRENT.md` after meaningful progress.
4. Update `DECISIONS.md` only for real technical decisions.
5. Keep live task state in `.gemini/forgekit/session.json`.
6. For multi-step work, write `plan-<slug>.md` under `.gemini/forgekit/plans/`.
7. Gate reports belong under `.gemini/forgekit/reports/`.
8. Research/debug notes belong under `.gemini/forgekit/notes/` only when they will be reused.
9. Rebuild the local memory index under `.gemini/forgekit/index/` after meaningful memory changes.
