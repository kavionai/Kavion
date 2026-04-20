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
