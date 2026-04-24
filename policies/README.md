# Kavion Policies

This directory contains policy guardrails for safer workflows.

Gemini CLI loads policy files from `~/.gemini/policies/*.toml` by default or
from configured `policyPaths`. Extension policy files are shipped here as
templates; copy or symlink them into your active Gemini policy directory to use
them.

Install locally:

```bash
mkdir -p ~/.gemini/policies
ln -sf "$(pwd)/policies/team-guardrails.toml" ~/.gemini/policies/kavion-team-guardrails.toml
```

Current guardrails:

- Deny `rm -rf`.
- Deny `git reset --hard`.
- Ask before `git clean`.
- Ask before `git push`.
- Ask before `git commit`.
- Ask before dangerous database statements.
- Ask before file writes and targeted replacements.
