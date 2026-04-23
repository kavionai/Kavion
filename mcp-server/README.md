# ForgeKit MCP Server

This is the optional MCP runtime for ForgeKit 2.

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
    "forgekit": {
      "command": "node",
      "args": ["${extensionPath}${/}mcp-server${/}index.js"],
      "cwd": "${extensionPath}${/}mcp-server",
      "env": {
        "FORGEKIT_WORKSPACE_PATH": "${workspacePath}"
      }
    }
  }
}
```

## ForgeKit 2 Tools

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

Compatibility aliases remain for the older tool names.

## Index

The local search cache lives under:

```text
.gemini/forgekit/index/
  chunks.jsonl
  bm25.json
  .dirty
```

Files remain the source of truth. The index is rebuildable.
