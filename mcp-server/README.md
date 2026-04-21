# ForgeKit MCP Server

This is an optional lightweight MCP workflow server scaffold.

It is not enabled in `gemini-extension.json` yet, so ForgeKit can load without
Node dependencies. Enable it after installing dependencies.

## Install

```bash
cd mcp-server
npm install
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

Restart Gemini CLI after enabling.

## Tools

- `forgekit_initialize_workspace`
- `forgekit_create_session`
- `forgekit_get_status`
- `forgekit_archive_session`
- `forgekit_index_memory`
- `forgekit_search_memory`
- `forgekit_audit_memory`

## Local Memory Index

The memory tools build and search a local cache under:

```text
.gemini/forgekit/memory/
  manifest.json
  memory.jsonl
  vectors.jsonl
```

Markdown files remain the source of truth. The index is used only for bounded
recall and search.

The current backend is dependency-light:

- JSONL chunk metadata
- exact token matching
- local hash-vector similarity

Future versions may add `sqlite-vec` or another local vector backend.
