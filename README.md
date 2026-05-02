<p align="center">
  <img src="assets/kavion-2.png" alt="Kavion" width="100%">
</p>

<p align="center">
  <strong>Structured AI software team workflows with local project memory, real workflow gates, and durable session state.</strong>
</p>

<p align="center">
  <a href="https://github.com/kalpeshchouhan/Kavion"><img alt="Version" src="https://img.shields.io/badge/version-0.6.0-202124"></a>
  <a href="LICENSE"><img alt="License" src="https://img.shields.io/badge/license-MIT-00A887"></a>
  <img alt="AI Coding CLI" src="https://img.shields.io/badge/AI%20coding%20CLI-extension-4C7BE8">
  <img alt="MCP" src="https://img.shields.io/badge/MCP-supported-D9A000">
  <img alt="Memory" src="https://img.shields.io/badge/memory-BM25%20local-D64550">
</p>

# Kavion

Kavion is a local-first workflow system for AI coding CLIs. It keeps project memory small, verification honest, and active work resumable.

Core architecture:

- `.kavion/state.db` is the machine source of truth for task and session state
- `CURRENT.md` and `session.json` are rendered views, not writable state inputs
- `PROJECT.md` and `DECISIONS.md` stay human-authored and git-tracked
- `chunks.jsonl` and `bm25.json` stay rebuildable local search cache
- Gemini hooks observe the workflow and the worker enforces the state machine

<p align="center">
  <img src="assets/kavion-workflow.svg" alt="Kavion workflow diagram" width="100%">
</p>

## Quick Start

Current install path:

```bash
gemini extensions link .
```

Restart your CLI after linking or changing extension files.

Inside the CLI:

```text
/extensions list
/kavion:init-project
/kavion:feature "Build a settings page"
/kavion:status
/kavion:gate ship
/kavion:migrate
/kavion:search "auth flow"
```

For most users, `/kavion:feature` is the only command needed to begin serious work. It starts or resumes the session internally when needed. `/kavion:start` remains available for explicit session control.

## Primary Commands

Most users only need this smaller command set:

```text
/kavion:init-project
/kavion:feature "Build ..."
/kavion:fix-issue "Fix ..."
/kavion:review
/kavion:status
/kavion:resume
/kavion:gate ship
/kavion:archive
/kavion:search "query"
/kavion:migrate
```

Advanced or compatibility commands still exist, but they are no longer the main documented path:

- `/kavion:start`
- `/kavion:checkpoint`
- `/kavion:release-readiness`
- `/kavion:quality-gate`
- `/kavion:session-update`
- `/kavion:memory-update`
- `/kavion:memory-index`
- `/kavion:memory-search`
- `/kavion:dashboard`

## Memory Layout

Kavion uses:

```text
.kavion/
  PROJECT.md
  DECISIONS.md
  DECISIONS-archive.md
  CURRENT.md
  session.json
  state.db
  history/
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

- SQLite is the machine source of truth.
- `CURRENT.md` and `session.json` are rendered from worker state.
- `PROJECT.md` and `DECISIONS.md` are primary human memory.
- The BM25 index is a rebuildable cache.
- Notes are optional and can expire.

## Gates

Kavion has one gate surface:

```text
/kavion:gate plan
/kavion:gate test
/kavion:gate review
/kavion:gate security
/kavion:gate ship
```

These gates rely on:

- real command exit codes
- report freshness
- git cleanliness
- branch state
- current session state

## Worker + MCP Server

The worker + MCP server now provide:

- workspace initialization
- worker-backed session start and phase transitions
- plan and report artifacts backed by SQLite
- plan step tracking with owner agents and progress
- worker-backed specialist handoffs and delegation evidence
- active specialist ownership windows for implementation
- canonical QA/review/security report artifacts instead of generic execution logs
- rendered `CURRENT.md` and `session.json`
- BM25 index build and search
- chunk reads
- migration from the file-first memory layout
- note writing with TTL rules
- memory hygiene checks
- real workflow gates

`/kavion:init-project` also installs the worker hook set into project `.gemini/settings.json`:

- `SessionStart`
- `BeforeAgent`
- `BeforeTool`
- `AfterTool`

The extension ships a vendored MCP runtime, so `gemini extensions install` does not need a follow-up `npm install` inside the installed extension copy.

The MCP worker binds to the active Gemini workspace through `${workspacePath}`. If `/kavion:status` ever shows the extension install directory instead of your project path, the extension install is stale and needs to be relinked or updated.

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
