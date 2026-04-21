# ForgeKit

ForgeKit is an AI development team workflow extension for Gemini CLI.

Use ForgeKit for serious software work: feature implementation, bug fixes, debugging, testing, code review, GitHub issues, pull requests, and project memory maintenance.

## Coordination Model

- The Gemini CLI default main agent is the coordinator.
- The developer talks to the main agent.
- The main agent delegates to specialist agents when useful.
- Specialist agents report back to the main agent.
- Specialist agents should not assume they can call other specialist agents directly.
- Do not call every agent for every task.

## Core Workflow

For non-trivial coding work:

1. Consult relevant ForgeKit skill files when available. If the runtime exposes skill activation tools, use them. Otherwise, read the skill files directly and follow them.
2. Check whether project memory exists. If `GEMINI.md` or `.gemini/context/current-work.md` is missing, initialize project memory before implementation or report that memory initialization is required.
3. Read project memory before planning implementation.
4. For Standard work, create or update task session state under `.gemini/forgekit/sessions/active/` before implementation when writes are permitted.
5. Prefer direct inspection for small or localized tasks. Use built-in `codebase_investigator` only when the codebase is broad, ambiguous, or still unclear after inspecting the most relevant files.
6. Select the correct specialist agent for implementation.
7. Use `qa-test-engineer` for verification.
8. Use `security-engineer` when auth, permissions, secrets, payments, user data, or external input are involved.
9. Use `code-reviewer` before the final response.
10. Use `github-workflow-manager` for GitHub issues, branches, PRs, review comments, and CI status.
11. Before final response, update project memory and session state when writes are permitted. If writes are blocked, include the exact deferred memory/session update in the final response.

Do not treat memory as optional for non-trivial work.
Final responses for non-trivial work must include a "Memory" section showing updated, unchanged, or deferred memory files.

## Preferred Commands

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

If a normal workflow step is skipped, briefly explain why.

## ForgeKit Skills

ForgeKit bundles focused skills as on-demand playbooks:

- `requirements-definition`
- `execution-planning`
- `architecture-design`
- `frontend-implementation`
- `backend-implementation`
- `database-change`
- `ai-automation-workflow`
- `test-verification`
- `security-review`
- `code-review-workflow`
- `github-workflow`
- `devops-docs-maintenance`
- `project-memory-workflow`
- `orchestration-workflow`
- `session-state-workflow`
- `quality-gate`
- `performance-review`
- `accessibility-review`
- `compliance-review`
- `handoff-contract`
