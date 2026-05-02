# Kavion Architecture

Kavion has five main parts:

1. extension files and configuration
2. Gemini hook enforcement
3. specialist agent prompts
4. slash command workflows
5. worker-backed MCP runtime for memory, search, migration, and gates
6. worker-backed specialist delegation and handoff tracking

## Memory Model

Kavion now splits state into:

- primary human memory
  - `PROJECT.md`
  - `DECISIONS.md`
- machine truth
  - `.kavion/state.db`
- rendered views
  - `CURRENT.md`
  - `session.json`
  - `history/`
- artifact folders
  - `plans/`
  - `reports/`
  - `notes/`
- rebuildable index
  - `index/`

## Search

Kavion now uses:

- `chunks.jsonl`
- `bm25.json`

This is a local BM25 index built from project memory files.

## Gates

Kavion collapses workflow enforcement into a gate model:

- `plan`
- `test`
- `review`
- `security`
- `ship`

The important design rule is:

> gates read real state, not agent self-report

## Hooks

The current hook set is:

- `SessionStart`
- `BeforeAgent`
- `BeforeTool`
- `AfterTool`

These hooks call the worker, not direct file mutations.

`BeforeTool` is the main policy layer. It blocks:

- direct edits to `.kavion/state.db` and its sidecars
- direct edits to rendered views under `.kavion/CURRENT.md`, `.kavion/session.json`, `.kavion/plans/`, `.kavion/reports/`, and `.kavion/history/`
- Standard code-phase edits that start before a specialist ownership window exists
- code edits that happen under the wrong active specialist for the touched path

## Delegation Model

Kavion now treats specialist work as worker-backed session evidence, not just prompt intent.

- required specialists are inferred from task scope
- each specialist should produce a structured handoff through `kavion_delegate`
- specialist-owned implementation should begin with `kavion_delegate` status `spawned` so observed file edits attach to the specialist owner
- plan artifacts are broken into worker-tracked plan steps with per-step owners and evidence
- ship/archive fail when required handoffs or required reports are missing
- ship also fails when required implementation specialists have no worker-observed file ownership
- stale QA, review, and security evidence also block completion
- the main agent remains coordinator, not the primary implementer for Standard work

## Entry Points

Kavion now treats `/kavion:feature` as the default user entrypoint for serious feature work.

- `/kavion:feature` should auto-start or resume the worker-backed session when needed
- `/kavion:start` remains available for explicit session bootstrap and inspection
- the worker lifecycle stays the same; this is a user-facing command simplification, not a separate state model

The broader user-facing command surface is intentionally compressed:

- primary commands: `init-project`, `feature`, `fix-issue`, `review`, `status`, `resume`, `gate`, `archive`, `search`, `migrate`
- advanced or compatibility commands: `start`, `checkpoint`, `release-readiness`, `quality-gate`, `session-update`, `memory-update`, `memory-index`, `memory-search`, `dashboard`

## Migration

The worker can migrate the older file-first Kavion session flow into SQLite-backed state while preserving existing plans, reports, and notes.
