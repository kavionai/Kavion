# Project Instructions

This project uses Kavion project memory.

Always read first:

@./kavion/CURRENT.md

Read on demand only when relevant:

- `./kavion/PROJECT.md`
- `./kavion/DECISIONS.md`
- `./kavion/session.json`
- `./kavion/plans/`
- `./kavion/reports/`
- `./kavion/notes/`

Rules:

1. Keep hot memory small.
2. Do not read `PROJECT.md` or `DECISIONS.md` unless the task needs them.
3. Update `CURRENT.md` after meaningful progress.
4. Update `DECISIONS.md` only for real technical decisions.
5. Keep live task state in `.gemini/kavion/session.json`.
6. For multi-step work, write `plan-<slug>.md` under `.gemini/kavion/plans/`.
7. Gate reports belong under `.gemini/kavion/reports/`.
8. Research/debug notes belong under `.gemini/kavion/notes/` only when they will be reused.
9. Rebuild the local memory index under `.gemini/kavion/index/` after meaningful memory changes.
