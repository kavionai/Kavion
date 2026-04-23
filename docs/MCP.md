# ForgeKit MCP

ForgeKit 2 uses an MCP server for workspace memory, search, migration, and real gates.

## Tools

- `forgekit_initialize_workspace`
- `forgekit_update_session`
- `forgekit_archive_session`
- `forgekit_build_index`
- `forgekit_search`
- `forgekit_read_chunk`
- `forgekit_status`
- `forgekit_gate`
- `forgekit_write_note`
- `forgekit_memory_gc`
- `forgekit_migrate`

Compatibility aliases still exist for the older `forgekit_index_memory`, `forgekit_search_memory`, `forgekit_dashboard`, `forgekit_check_workflow`, and `forgekit_release_readiness` names.

## Index

The MCP server builds:

```text
.gemini/forgekit/index/chunks.jsonl
.gemini/forgekit/index/bm25.json
```

This replaces the older LanceDB/vector setup.

## Gates

`forgekit_gate` supports:

- `status`
- `plan`
- `test`
- `review`
- `security`
- `ship`

The gate model prefers:

- real command exit codes
- git state
- report freshness
- session state

## Install

From `mcp-server/`:

```bash
npm install
npm run check
```
