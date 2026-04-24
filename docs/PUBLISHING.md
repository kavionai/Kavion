# Publishing

Use this checklist before making Kavion public.

## Pre-publish

1. Confirm the license is the one you want.
2. Read:
   - `README.md`
   - `CONTRIBUTING.md`
   - `docs/ARCHITECTURE.md`
   - `docs/MEMORY.md`
   - `docs/MCP.md`
   - `docs/WORKFLOW-ENFORCEMENT.md`
   - `docs/VERSIONING.md`
3. Run validation:

```bash
gemini extensions validate .
python3 -c "import tomllib; tomllib.load(open('commands/kavion/fix-issue.toml','rb'))"
node --check mcp-server/index.js
```

4. Confirm version consistency:

```text
gemini-extension.json
mcp-server/package.json
mcp-server/package-lock.json
README.md
CHANGELOG.md
```

5. Make sure local runtime state is not being committed:

```bash
git status --short
```

## First Commit

Suggested title:

```text
Release Kavion v0.1.0
```

Suggested summary:

```text
- ship Kavion memory layout and BM25 search
- move workflow enforcement to real gates
- add migration support from the old memory layout
```

## GitHub Repo Setup

Suggested repo description:

```text
Structured AI software team workflows with local project memory, real workflow gates, and durable session state.
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
git commit -m "Initial open-source release of Kavion"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Recommended First Release State

Publish as a beta or `v0.1.0` style release, not as a fully stable
automation platform.

Current honest positioning:

- ready to use
- strong beta
- Kavion memory, BM25 search, and real gates are in place
- migration support exists for older project layouts
- not yet fully battle-tested for long autonomous write-heavy runs across many projects
