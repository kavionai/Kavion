# Kavion Architecture

Kavion has four main parts:

1. extension files and configuration
2. specialist agent prompts
3. slash command workflows
4. optional MCP runtime for memory, search, migration, and gates

## Memory Model

Kavion replaces the old `.gemini/context/` layout with:

- `PROJECT.md`
- `DECISIONS.md`
- `CURRENT.md`
- `session.json`
- `history.jsonl`
- `plans/`
- `reports/`
- `notes/`
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

## Migration

The MCP server can migrate legacy ForgeKit memory layouts into the Kavion layout when older project state is still present under `.gemini/context/` or `.gemini/forgekit/`.
