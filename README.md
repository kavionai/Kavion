# ForgeKit

ForgeKit is a Gemini CLI extension that turns a single Gemini session into a
structured software team workflow.

It provides:

- specialist agents for frontend, backend, database, review, security, QA, and
  docs/memory work
- team commands for orchestration, bug fixing, review, session state, and
  quality gates
- project-memory and session-state conventions under `.gemini/`
- local memory index/search commands with token-safe recall limits
- optional policy and MCP scaffolding for stricter workflow control

This repository follows the official Gemini CLI extension shape:

- `gemini-extension.json` defines the extension.
- `GEMINI.md` provides extension context.
- `commands/` contains custom slash commands.
- `agents/` contains custom subagents.
- `policies/` contains workflow guardrails.
- `skills/` contains workflow playbooks.
- `templates/` contains project memory templates.
- `mcp-server/` contains an optional workflow-state MCP server scaffold.

## Status

ForgeKit is usable now as a strong beta:

- extension loading works
- core memory/session workflow exists
- orchestration and quality-gate flows work
- bug-fix flow has been tightened substantially

The main remaining risk is end-to-end reliability for long autonomous
write-heavy bug-fix runs.

## Quick Start

From this directory:

```bash
gemini extensions link .
```

Restart Gemini CLI after linking or changing extension-level files.

Inside Gemini CLI:

```text
/extensions list
```

Then test:

```text
/team:init-project
/team:orchestrate "Build a settings page"
/team:fix-issue "Memory workflow is incomplete"
/team:session-update
/team:quality-gate
```

Validation commands:

```bash
gemini extensions validate .
python3 -c "import tomllib; tomllib.load(open('commands/team/fix-issue.toml','rb'))"
node --check mcp-server/index.js
```

## Commands

- `/team:init-project`
- `/team:orchestrate`
- `/team:fix-issue`
- `/team:feature`
- `/team:debug`
- `/team:review`
- `/team:pr`
- `/team:status`
- `/team:session-update`
- `/team:resume`
- `/team:archive`
- `/team:quality-gate`
- `/team:security-audit`
- `/team:perf-check`
- `/team:a11y-audit`
- `/team:compliance-check`
- `/team:memory-update`
- `/team:memory-index`
- `/team:memory-search`
- `/team:memory-audit`
- `/team:memory-compact`

## Docs

- [QUICKSTART](docs/QUICKSTART.md)
- [ARCHITECTURE](docs/ARCHITECTURE.md)
- [MEMORY](docs/MEMORY.md)
- [PUBLISHING](docs/PUBLISHING.md)
- [ADDING-AGENTS](docs/ADDING-AGENTS.md)
- [ADDING-SKILLS](docs/ADDING-SKILLS.md)
- [CONTRIBUTING](CONTRIBUTING.md)
- [SECURITY](SECURITY.md)

## Community Files

- [LICENSE](LICENSE)
- [CODE_OF_CONDUCT](CODE_OF_CONDUCT.md)
- [CHANGELOG](CHANGELOG.md)

## Optional Policies

ForgeKit ships policy templates in `policies/`. Gemini CLI loads policies from
`~/.gemini/policies/*.toml` or configured `policyPaths`. To activate:

```bash
mkdir -p ~/.gemini/policies
ln -sf "$(pwd)/policies/team-guardrails.toml" ~/.gemini/policies/forgekit-team-guardrails.toml
```

## Optional MCP Workflow Server

The optional MCP server is scaffolded but not enabled in
`gemini-extension.json`. Enable it after running `npm install` in
`mcp-server/`.

## Contributing

Before opening this to other developers, read:

- [CONTRIBUTING](CONTRIBUTING.md)
- [ARCHITECTURE](docs/ARCHITECTURE.md)
- [MEMORY](docs/MEMORY.md)
