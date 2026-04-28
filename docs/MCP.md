# Kavion Worker + MCP

Kavion uses a worker-backed MCP server for SQLite state, rendered views, search, migration, and real gates.

## Tools

- `kavion_initialize_workspace`
- `kavion_session_start`
- `kavion_session_transition`
- `kavion_plan_create`
- `kavion_report_create`
- `kavion_delegate`
- `kavion_archive_session`
- `kavion_build_index`
- `kavion_search`
- `kavion_read_chunk`
- `kavion_status`
- `kavion_gate`
- `kavion_write_note`
- `kavion_memory_gc`
- `kavion_migrate`

Compatibility wrappers remain available for the older command prompts:

- `kavion_update_session`
- `kavion_update_current`
- `kavion_write_plan`
- `kavion_write_report`

## Index

The MCP server builds:

```text
.kavion/index/chunks.jsonl
.kavion/index/bm25.json
```

This replaces the older file-first memory cache setup.

## Gates

`kavion_gate` supports:

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

## Delegation

`kavion_delegate` records a specialist handoff in worker state.

Use it to persist:

- specialist name
- summary
- files changed
- tests run
- risks and blockers
- next step
- downstream context for QA, security, review, or docs

Ship and archive are now blocked when required specialist handoffs are missing.

## Install

From `mcp-server/`:

```bash
npm install
npm run check
```

`/kavion:init-project` installs the minimal Gemini hook set into project `.gemini/settings.json` and points those hooks at the same worker entrypoint.
