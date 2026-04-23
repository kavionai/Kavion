# ForgeKit

ForgeKit is an AI development team workflow extension for Gemini CLI.

Use ForgeKit for serious software work: feature implementation, bug fixes, debugging, testing, code review, GitHub issues, pull requests, and project memory maintenance.

## Coordination Model

- The Gemini CLI default main agent is the coordinator.
- The developer talks to the main agent.
- The main agent delegates to specialist agents when useful.
- Specialist agents report back to the main agent.
- Do not call every agent for every task.

## Core Workflow

For non-trivial coding work:

1. Consult relevant ForgeKit skill files when available.
2. Check whether ForgeKit 2 project memory exists. If `GEMINI.md` or `.gemini/forgekit/CURRENT.md` is missing, initialize project memory before implementation or report that memory initialization is required.
3. Read `.gemini/forgekit/CURRENT.md` first.
4. Read `.gemini/forgekit/PROJECT.md` and `.gemini/forgekit/DECISIONS.md` only when the task actually needs them.
5. For Standard work, create or update `.gemini/forgekit/session.json` before implementation when writes are permitted.
6. Use plans for multi-step work under `.gemini/forgekit/plans/plan-<slug>.md`.
7. Use real commands and filesystem state for verification and gates.
8. Use `qa-test-engineer` for verification.
9. Use `security-engineer` when auth, permissions, secrets, payments, user data, or external input are involved.
10. Use `code-reviewer` before the final response.
11. Use `github-workflow-manager` for GitHub issues, branches, PRs, review comments, and CI status.
12. Before final response, update project memory and session state when writes are permitted.
13. After updating memory or session state, refresh `.gemini/forgekit/index/` using `forgekit_build_index` when MCP is available, or `/team:memory-index` logic when it is not.
14. Run a workflow checkpoint before handoff. Do not call work release-ready when ship gate blocks.

Do not treat memory as optional for non-trivial work.
Final responses for non-trivial work must include a Memory section showing updated, unchanged, or deferred memory files, index refresh status, and gate/checkpoint status.

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
- `/team:checkpoint`
- `/team:workflow-audit`
- `/team:release-readiness`
- `/team:memory-update`
- `/team:memory-index`
- `/team:memory-search`
- `/team:memory-audit`
- `/team:memory-compact`
- `/team:dashboard`
- `/forge:init-project`
- `/forge:status`
- `/forge:gate`
- `/forge:migrate`
- `/forge:search`

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
