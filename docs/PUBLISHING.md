# Publishing

Use this checklist before making ForgeKit public.

## Pre-publish

1. Confirm the license is the one you want.
2. Read:
   - `README.md`
   - `CONTRIBUTING.md`
   - `docs/ARCHITECTURE.md`
   - `docs/MEMORY.md`
3. Run validation:

```bash
gemini extensions validate .
python3 -c "import tomllib; tomllib.load(open('commands/team/fix-issue.toml','rb'))"
node --check mcp-server/index.js
```

4. Make sure local runtime state is not being committed:

```bash
git status --short
```

## First Commit

Suggested title:

```text
Initial open-source release of ForgeKit
```

Suggested summary:

```text
- add ForgeKit extension scaffold
- add agents, skills, commands, and memory templates
- add contributor and architecture docs
- add GitHub community files
```

## GitHub Repo Setup

Suggested repo description:

```text
Gemini CLI extension for structured multi-agent software development workflows.
```

Suggested topics:

- `gemini-cli`
- `ai-agents`
- `developer-tools`
- `workflow-automation`
- `prompt-engineering`
- `mcp`
- `software-engineering`

## Suggested First Push Flow

```bash
git init
git add .
git commit -m "Initial open-source release of ForgeKit"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Recommended First Release State

Publish as a beta or `v0.1.0` style first release, not as a fully stable
automation platform.

Current honest positioning:

- ready to use
- strong beta
- not yet fully battle-tested for long autonomous bug-fix runs
