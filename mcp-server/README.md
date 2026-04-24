# Kavion MCP Server

This is the optional MCP runtime for Kavion.

It powers:

- workspace initialization
- session state updates
- BM25 memory index build and search
- chunk reads
- note writing with TTL rules
- memory hygiene checks
- old-layout migration
- real workflow gates

## Install

```bash
cd mcp-server
npm install
npm run check
```

## Enable

Add this to `gemini-extension.json`:

```json
{
  "mcpServers": {
    "kavion": {
      "command": "node",
      "args": ["${extensionPath}${/}mcp-server${/}index.js"],
      "cwd": "${extensionPath}${/}mcp-server",
      "env": {
        "KAVION_WORKSPACE_PATH": "${workspacePath}"
      }
    }
  }
}
```

## Kavion Tools

- `kavion_initialize_workspace`
- `kavion_update_session`
- `kavion_update_current`
- `kavion_write_plan`
- `kavion_write_report`
- `kavion_archive_session`
- `kavion_build_index`
- `kavion_search`
- `kavion_read_chunk`
- `kavion_status`
- `kavion_gate`
- `kavion_write_note`
- `kavion_memory_gc`
- `kavion_migrate`

## Index

The local search cache lives under:

```text
.gemini/kavion/index/
  chunks.jsonl
  bm25.json
  .dirty
```

Files remain the source of truth. The index is rebuildable.
