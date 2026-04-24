# Project Instructions

This project uses Kavion project memory.

Always read first:

@./.kavion/CURRENT.md

Read on demand only when relevant:

- `./.kavion/PROJECT.md`
- `./.kavion/DECISIONS.md`
- `./.kavion/plans/`
- `./.kavion/reports/`
- `./.kavion/notes/`

Rules:

1. Keep hot memory small.
2. Do not read `PROJECT.md` or `DECISIONS.md` unless the task needs them.
3. Start or resume the Kavion worker-backed session before non-trivial work.
4. Do not hand-edit `.kavion/CURRENT.md` or `.kavion/session.json`; they are rendered from `.kavion/state.db`.
5. Update `DECISIONS.md` only for real technical decisions.
6. For multi-step work, create a plan artifact before entering code phase.
7. Gate reports belong under `.kavion/reports/`.
8. Research/debug notes belong under `.kavion/notes/` only when they will be reused.
9. Rebuild the local memory index under `.kavion/index/` after meaningful memory changes.
