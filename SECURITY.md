# Security Policy

## Scope

ForgeKit is a Gemini CLI extension. Security concerns are mostly about:

- unsafe tool usage
- leaking secrets into memory files
- unintended write behavior
- risky prompt or workflow changes
- optional MCP server execution

## Reporting

If you find a security issue, do not open a public bug report with secrets,
tokens, credentials, or exploit details.

Report the issue privately to the project maintainer first.

## Contributor Rules

- Never commit secrets.
- Do not store secrets in `.gemini/` memory files.
- Treat policy changes as security-sensitive.
- Treat MCP server changes as security-sensitive.
- Keep dangerous shell or file-system behavior behind explicit guardrails.

## Sensitive Areas

- `policies/team-guardrails.toml`
- `mcp-server/`
- any command that changes files automatically
- any agent that can write broadly across the repo
