# ForgeKit Architecture

ForgeKit 2 has four main parts:

1. Gemini CLI extension files
2. specialist agent prompts
3. slash command workflows
4. optional MCP runtime for memory, search, migration, and gates

## Memory Model

ForgeKit 2 replaces the old `.gemini/context/` layout with:

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

ForgeKit now uses:

- `chunks.jsonl`
- `bm25.json`

This is a local BM25 index built from project memory files.

## Gates

ForgeKit 2 collapses workflow enforcement into a gate model:

- `plan`
- `test`
- `review`
- `security`
- `ship`

The important design rule is:

> gates read real state, not agent self-report

## Backward Compatibility

The MCP server still exposes compatibility aliases for older tool names while projects migrate to the ForgeKit 2 layout.
