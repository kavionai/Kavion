# Memory Model

ForgeKit uses two related but different memory layers.

## Hot Project Memory

Hot memory lives in `.gemini/context/`:

- `project-brief.md`
- `architecture.md`
- `commands.md`
- `testing.md`
- `current-work.md`
- `decisions.md`
- `github.md`

This is the small stable context that the project-level `GEMINI.md` loads first.

## Warm Notes

Warm notes live in `.gemini/notes/`.

Use them for:

- temporary research
- logs
- exploratory notes
- details that should not pollute hot context

## Cold Archive

Cold archive lives in `.gemini/archive/`.

Move stale or large material there when it no longer belongs in hot memory.

## Session State

Task-local changing execution state lives in `.gemini/forgekit/`:

- `sessions/active/`
- `sessions/archive/`
- `plans/`
- `reports/`

Use session state for:

- current phase
- files touched
- verification logs
- blockers
- next step

Do not keep fast-changing execution detail in hot memory.

## Commands

- `/team:init-project`: create starter memory structure
- `/team:memory-update`: sync stable progress into hot memory
- `/team:session-update`: update task-local session state
- `/team:archive`: move finished sessions out of active state

## Rule Of Thumb

- stable and reusable: hot memory
- changing task detail: session state
- temporary detail: notes
- old or bulky: archive
