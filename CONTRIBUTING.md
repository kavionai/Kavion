# Contributing

ForgeKit is a workflow extension, not just a set of prompt files. Small changes
to commands, agents, skills, or memory templates can change runtime behavior
substantially. Keep changes narrow and validate them.

## Local Setup

From the `forgekit/` directory:

```bash
gemini extensions link .
```

Useful checks:

```bash
gemini extensions validate .
python3 -c "import tomllib; tomllib.load(open('commands/team/fix-issue.toml','rb'))"
ruby -e "require 'yaml'; text=File.read('skills/project-memory-workflow/SKILL.md'); front=text[/\\A---\\n(.*?)\\n---\\n/m,1]; YAML.safe_load(front)"
node --check mcp-server/index.js
```

## Repo Rules

- Keep edits focused.
- Prefer updating an existing agent, command, or skill over creating a new one.
- Do not add broad speculative workflow logic.
- Follow [VERSIONING](docs/VERSIONING.md) for patch, minor, and major changes.
- If you add a new command, make its ownership and stopping conditions explicit.
- If you add a new agent, define clear boundaries and output format.
- If you add a new skill, keep it procedural and short enough to be used in a
  real run.

## How To Contribute

### Commands

Commands live in `commands/team/` as TOML prompt files.

When editing a command:

- keep the flow ordered
- define a bounded starting point
- name the correct owner agent
- say when to stop researching and either fix or report a blocker

### Agents

Agents live in `agents/` as Markdown files with YAML frontmatter.

Each agent should define:

- role and ownership
- responsibilities
- boundaries
- working rules
- output format

Avoid overlapping ownership unless the overlap is intentional and documented.

### Skills

Skills live in `skills/<name>/SKILL.md`.

Each skill should:

- describe when it is used
- define concrete steps
- keep output shape clear
- avoid vague guidance like "investigate more" without a stopping point

### Memory Templates

Templates live in `templates/project-memory/`.

Keep hot memory small. Put changing task details into session files or notes.

## Pull Request Expectations

A good PR should include:

- summary of what changed
- reason for the change
- version bump decision
- validation run
- runtime risk or limitation if any remains

## Current High-Risk Areas

- `/team:fix-issue` later-phase convergence
- headless write behavior for session updates
- optional MCP server enablement
