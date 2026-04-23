# Versioning

ForgeKit uses SemVer-style versioning while it is in beta.

The release version must stay consistent across:

- `gemini-extension.json`
- `mcp-server/package.json`
- `mcp-server/package-lock.json`
- README version badge
- `CHANGELOG.md`

## Version Rules

### Patch: `x.y.Z`

Use a patch bump for safe fixes that do not add a new public workflow surface.

Examples:

- typo or docs correction
- command wording fix
- bug fix in an existing MCP tool
- stricter validation for an existing command
- small report/memory behavior fix

Example:

```text
0.4.0 -> 0.4.1
```

### Minor: `x.Y.0`

Use a minor bump for new user-facing ForgeKit capabilities.

Examples:

- new `/team:*` command
- new agent
- new skill
- new MCP tool
- new memory subsystem behavior
- new workflow gate

Example:

```text
0.3.0 -> 0.4.0
```

### Major: `X.0.0`

Use a major bump for breaking behavior.

Examples:

- command names removed or renamed
- memory folder structure changed incompatibly
- MCP tool input/output contract changed incompatibly
- existing workflow behavior changed in a way that breaks projects relying on it

Example:

```text
0.9.0 -> 1.0.0
```

## PR Checklist

For every PR, decide one of:

- no version bump: internal-only change not shipped to users yet
- patch bump
- minor bump
- major bump

If a version bump is needed, update all required files:

```text
gemini-extension.json
mcp-server/package.json
mcp-server/package-lock.json
README.md
CHANGELOG.md
```

Then run:

```bash
npm install --package-lock-only
gemini extensions validate .
node --check mcp-server/index.js
```

## Current Branch Rule

If multiple commits are part of the same unreleased PR, keep them under the same
target version. Do not create `0.4.1` on a branch whose purpose is still the
unreleased `0.4.0` feature release.
