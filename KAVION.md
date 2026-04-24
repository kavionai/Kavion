# Kavion

Kavion is a structured AI software workflow system.

Use Kavion for serious software work: feature implementation, bug fixes, debugging, testing, code review, GitHub issues, pull requests, and project memory maintenance.

## Coordination Model

- The default main agent is the coordinator.
- The developer talks to the main agent.
- The main agent delegates to specialist agents when useful.
- Specialist agents report back to the main agent.
- Do not call every agent for every task.

## Core Workflow

For non-trivial coding work:

1. Consult relevant Kavion skill files when available.
2. Check whether Kavion project memory exists. If `KAVION.md` or `.kavion/CURRENT.md` is missing, initialize project memory first.
3. Read `.kavion/CURRENT.md` first.
4. Read `.kavion/PROJECT.md` and `.kavion/DECISIONS.md` only when the task actually needs them.
5. For non-trivial work, start or resume the worker-backed session before implementation.
   - Prefer MCP tool `kavion_session_start`.
   - Do not hand-edit `.kavion/session.json`; it is a rendered view.
6. Use `kavion_session_transition` to move between `init`, `plan`, `code`, `test`, `review`, and `ship`.
7. Use `kavion_plan_create` for multi-step work. Medium work must not enter `code` phase without a plan artifact.
8. Use real commands and filesystem state for verification and gates.
9. Use `qa-test-engineer` for verification.
10. Use `security-engineer` when auth, permissions, secrets, payments, user data, or external input are involved.
11. Use `code-reviewer` before the final response.
12. Use `kavion_report_create` for QA, review, and security reports.
13. Before final response, keep shared state in the worker. Let Kavion render `.kavion/CURRENT.md` and `.kavion/session.json`.
14. After meaningful memory changes, refresh `.kavion/index/` using `kavion_build_index` when MCP is available, or `/kavion:memory-index` when it is not.
15. Do not call work release-ready when ship gate blocks.

Do not treat memory as optional for non-trivial work.
Final responses for non-trivial work must include a Memory section showing updated, unchanged, or deferred memory files, index refresh status, and gate/checkpoint status.

## Preferred Commands

- `/kavion:init-project`
- `/kavion:start`
- `/kavion:orchestrate`
- `/kavion:fix-issue`
- `/kavion:feature`
- `/kavion:debug`
- `/kavion:review`
- `/kavion:pr`
- `/kavion:status`
- `/kavion:session-update`
- `/kavion:resume`
- `/kavion:archive`
- `/kavion:quality-gate`
- `/kavion:checkpoint`
- `/kavion:workflow-audit`
- `/kavion:release-readiness`
- `/kavion:memory-update`
- `/kavion:memory-index`
- `/kavion:memory-search`
- `/kavion:memory-audit`
- `/kavion:memory-compact`
- `/kavion:dashboard`
- `/kavion:gate`
- `/kavion:migrate`
- `/kavion:search`

If a normal workflow step is skipped, briefly explain why.

## Kavion Skills

Kavion bundles focused skills as on-demand playbooks:

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
