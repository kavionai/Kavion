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

## Local Memory Index

ForgeKit can maintain a local searchable memory index under:

```text
.gemini/forgekit/memory/
  manifest.json
  memory.jsonl
  vectors.jsonl
```

Markdown remains the source of truth. The index is only a cache for recall.

The current local backend is:

- JSONL metadata for chunks
- exact keyword matching
- local hash-vector recall
- source paths for every result

This is intentionally local-first and dependency-light. It does not send memory
to a hosted vector database.

Future backends can add `sqlite-vec`, LanceDB, or another local vector engine,
but they should keep the same rule: every result must point back to a real
source file.

## Token Safety

Do not load the full index into a prompt.

Recommended limits:

- top results: 5
- max chunk size: 1200 characters
- max total recall: 5000 characters
- always read the source file before relying on a recalled chunk

## Commands

- `/team:init-project`: create starter memory structure
- `/team:memory-update`: sync stable progress into hot memory
- `/team:session-update`: update task-local session state
- `/team:memory-index`: build or refresh the local memory index
- `/team:memory-search`: search local memory with bounded recall
- `/team:memory-audit`: check memory health and missing files
- `/team:memory-compact`: move stale detail out of hot memory
- `/team:archive`: move finished sessions out of active state

## Rule Of Thumb

- stable and reusable: hot memory
- changing task detail: session state
- temporary detail: notes
- old or bulky: archive
- search and recall: local memory index
