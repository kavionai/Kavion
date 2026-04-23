# ForgeKit Memory

ForgeKit 2 uses a smaller, stricter memory model.

![ForgeKit 2 Memory Flow](../assets/forgekit-memory-flow.svg)

## Layout

```text
.gemini/forgekit/
  PROJECT.md
  DECISIONS.md
  DECISIONS-archive.md
  CURRENT.md
  session.json
  history.jsonl
  gates.yaml
  plans/
  reports/
  notes/
  index/
    chunks.jsonl
    bm25.json
    .dirty
```

## What Each File Does

- `CURRENT.md`
  - hot memory
  - active task, status, blockers, next step

- `session.json`
  - live structured task state
  - phase, workflow, active agent, files touched, gate cache

- `PROJECT.md`
  - repo-level truths
  - architecture and conventions

- `DECISIONS.md`
  - durable technical decisions

- `history.jsonl`
  - archived sessions

- `plans/`
  - multi-step work plans

- `reports/`
  - gate evidence and review output

- `notes/`
  - optional research/debug notes
  - subject to TTL unless marked persistent
  - should exist only when findings are reusable

- `index/`
  - local BM25 search cache
  - rebuildable

## Rules

- files are the source of truth
- the index is only a cache
- read `CURRENT.md` first
- read `PROJECT.md` and `DECISIONS.md` only when needed
- keep `PROJECT.md` under 300 lines
- keep `CURRENT.md` under 50 lines
- use notes only for reusable research/debug material
- do not duplicate the same fact across many files

## Search

ForgeKit 2 indexes memory into:

```text
.gemini/forgekit/index/chunks.jsonl
.gemini/forgekit/index/bm25.json
```

Use:

```text
/team:memory-index
/team:memory-search "query"
```

or:

```text
/forge:search "query"
```

## Migration

Older ForgeKit projects may still have:

```text
.gemini/context/
.gemini/archive/
.gemini/forgekit/sessions/
.gemini/forgekit/memory/
```

ForgeKit 2 can migrate those into the new structure with:

```text
/forge:migrate
```
