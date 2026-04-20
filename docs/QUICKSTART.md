# Quickstart

## 1. Link the extension

From the `forgekit/` directory:

```bash
gemini extensions link .
```

Restart Gemini CLI if it is already open.

## 2. Check that it loaded

Inside Gemini CLI:

```text
/extensions list
```

## 3. Initialize project memory

In a target project:

```text
/team:init-project
```

This creates the expected `.gemini/` memory and session folders.

## 4. Run basic commands

```text
/team:orchestrate "Summarize this repository"
/team:quality-gate
/team:session-update
```

## 5. Validate local changes

From `forgekit/`:

```bash
gemini extensions validate .
python3 -c "import tomllib; tomllib.load(open('commands/team/fix-issue.toml','rb'))"
```

## Current Caveat

Long autonomous bug-fix runs are improved but still not fully battle-tested.
