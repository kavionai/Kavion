# Kavion

Kavion is a structured AI software workflow system.

Use Kavion for serious software work: feature implementation, bug fixes, debugging, testing, code review, GitHub issues, pull requests, and project memory maintenance.

## Coordination Model

- The default main agent is the coordinator.
- The developer talks to the main agent.
- For non-trivial work, the main agent delegates to specialist agents according to task domain.
- The main agent must not perform the primary implementation itself when more than one specialist is required.
- Specialist agents report back to the main agent.
- Do not call every agent for every task.

## Core Workflow

For non-trivial coding work:

1. Consult relevant Kavion skill files when available.
2. Check whether Kavion project memory exists. If `KAVION.md` or `.kavion/CURRENT.md` is missing, initialize project memory first.
3. Read `.kavion/CURRENT.md` first.
4. Read `.kavion/PROJECT.md` and `.kavion/DECISIONS.md` only when the task actually needs them.
5. For non-trivial work, make sure the worker-backed session exists before implementation.
   - Prefer MCP tool `kavion_session_start`.
   - `/kavion:feature`, `/kavion:fix-issue`, and `/kavion:orchestrate` may bootstrap that session internally when it does not exist yet.
   - Do not hand-edit `.kavion/session.json`; it is a rendered view.
   - `/kavion:start` remains available for explicit session bootstrap, but it is optional.
6. Use `kavion_session_transition` to move between `init`, `plan`, `code`, `test`, `review`, and `ship`.
7. Use `kavion_plan_create` for multi-step work. Medium work must not enter `code` phase without a plan artifact.
8. For Standard work, use `task-planner` before implementation.
9. For backend/API/auth/server/Swagger work, use `backend-engineer`.
10. For schema, persistence, query, migration, and inventory/order/audit-log data work, use `database-engineer`.
11. For auth, role-based access, permissions, secrets, payments, or sensitive user data, use `security-engineer` before completion.
12. Use `qa-test-engineer` for verification and `code-reviewer` before the final response.
13. Use real commands and filesystem state for verification and gates.
14. After each specialist finishes meaningful work, persist a structured handoff with `kavion_delegate`.
    - Start the ownership window with `kavion_delegate` status `spawned` before that specialist begins primary implementation.
    - Include summary, files changed, tests run, risks, blockers, downstream context, and next step.
    - Keep implementation under that active specialist until the handoff closes with `completed`, `failed`, or `needs_context`.
    - For multi-step plans, update execution progress with `kavion_plan_step_update` as steps move from pending to in_progress to completed.
    - Non-trivial work is not complete until required specialist handoffs exist.
15. Use `kavion_report_create` for QA, review, and security reports.
16. Before final response, keep shared state in the worker. Let Kavion render `.kavion/CURRENT.md` and `.kavion/session.json`.
17. After meaningful memory changes, refresh `.kavion/index/` using `kavion_build_index` when MCP is available, or `/kavion:memory-index` when it is not.
18. Do not call work release-ready when ship gate blocks. Archive is blocked when required specialist handoffs or gate evidence are missing.
19. Do not hand-edit rendered Kavion views or worker state files.
    - `.kavion/CURRENT.md`, `.kavion/session.json`, `.kavion/plans/*`, `.kavion/reports/*`, and `.kavion/history/*` are worker-rendered outputs.
    - `.kavion/state.db` and SQLite sidecars are worker-owned.

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
