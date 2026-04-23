<p align="center">
  <img src="assets/forgekit-banner.svg" alt="ForgeKit: AI software team workflow extension for Gemini CLI" width="100%">
</p>

<p align="center">
  <strong>Turn Gemini CLI into a structured AI software team with project memory, specialist agents, real workflow gates, and local BM25 memory search.</strong>
</p>

<p align="center">
  <a href="https://github.com/kalpeshchouhan/forgekit"><img alt="Version" src="https://img.shields.io/badge/version-0.5.0-202124"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-00A887"></a>
  <img alt="Gemini CLI" src="https://img.shields.io/badge/Gemini%20CLI-extension-4C7BE8">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-D9A000">
  <img alt="Memory" src="https://img.shields.io/badge/memory-BM25%20local-D64550">
</p>

# ForgeKit

ForgeKit is a Gemini CLI extension that turns a single Gemini session into a structured software team workflow.

ForgeKit 2 changes the memory model:

- `PROJECT.md`, `DECISIONS.md`, and `CURRENT.md` replace the old `.gemini/context/` sprawl
- `session.json` and `history.jsonl` replace `sessions/active/` and `sessions/archive/`
- `chunks.jsonl` and `bm25.json` replace the old LanceDB and vector JSONL memory cache
- gates use real command output and filesystem state instead of trusting self-written reports

<p align="center">
  <img src="assets/forgekit-workflow.svg" alt="ForgeKit workflow diagram" width="100%">
</p>

## Quick Start

From this directory:

```bash
gemini extensions link .
```

Restart Gemini CLI after linking or changing extension files.

Inside Gemini CLI:

```text
/extensions list
/team:init-project
/team:feature "Build a settings page"
/team:checkpoint
/team:release-readiness
```

New ForgeKit 2 commands:

```text
/forge:init-project
/forge:status
/forge:gate ship
/forge:migrate
/forge:search "auth flow"
```

## Memory Layout

ForgeKit 2 uses:

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

Design rules:

- Markdown and JSON files are the source of truth.
- The BM25 index is a rebuildable cache.
- `CURRENT.md` and `session.json` are the hot memory.
- `PROJECT.md` and `DECISIONS.md` are read on demand, not every turn.
- Notes are optional and can expire.

## Gates

ForgeKit 2 has one gate surface:

```text
/forge:gate plan
/forge:gate test
/forge:gate review
/forge:gate security
/forge:gate ship
```

These gates rely on:

- real command exit codes
- report freshness
- git cleanliness
- branch state
- current session state

## MCP Server

The MCP server now provides:

- workspace initialization
- session update/archive
- BM25 index build and search
- chunk reads
- migration from the old memory layout
- note writing with TTL rules
- memory hygiene checks
- real workflow gates

Enable it after running `npm install` in `mcp-server/`.

## Docs

- [QUICKSTART](docs/QUICKSTART.md)
- [ARCHITECTURE](docs/ARCHITECTURE.md)
- [MEMORY](docs/MEMORY.md)
- [MCP](docs/MCP.md)
- [WORKFLOW-ENFORCEMENT](docs/WORKFLOW-ENFORCEMENT.md)
- [VERSIONING](docs/VERSIONING.md)
- [PUBLISHING](docs/PUBLISHING.md)
- [ADDING-AGENTS](docs/ADDING-AGENTS.md)
- [ADDING-SKILLS](docs/ADDING-SKILLS.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [SECURITY](SECURITY.md)
