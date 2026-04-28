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

The v1 hook set is:

- `SessionStart`
- `BeforeAgent`
- `AfterTool`

These hooks call the worker, not direct file mutations.

## Delegation Model

Kavion now treats specialist work as worker-backed session evidence, not just prompt intent.

- required specialists are inferred from task scope
- each specialist should produce a structured handoff through `kavion_delegate`
- ship/archive fail when required handoffs or required reports are missing
- the main agent remains coordinator, not the primary implementer for Standard work

## Migration

The worker can migrate the older file-first Kavion session flow into SQLite-backed state while preserving existing plans, reports, and notes.
