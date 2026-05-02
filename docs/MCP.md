# Kavion Worker + MCP

Kavion uses a worker-backed MCP server for SQLite state, rendered views, search, migration, and real gates.

## Tools

- `kavion_initialize_workspace`
- `kavion_session_start`
- `kavion_session_transition`
- `kavion_plan_create`
- `kavion_plan_step_update`
- `kavion_report_create`
- `kavion_delegate`
- `kavion_archive_session`
- `kavion_build_index`
- `kavion_search`
- `kavion_read_chunk`
- `kavion_status`
- `kavion_gate`
- `kavion_write_note`
- `kavion_memory_gc`
- `kavion_migrate`

Compatibility wrappers remain available for the older command prompts:

- `kavion_update_session`
- `kavion_update_current`
- `kavion_write_plan`
- `kavion_write_report`

## Index

The MCP server builds:

```text
.kavion/index/chunks.jsonl
.kavion/index/bm25.json
```

This replaces the older file-first memory cache setup.

## Gates

`kavion_gate` supports:

- `status`
- `plan`
- `test`
- `review`
- `security`
- `ship`

The gate model prefers:

- real command exit codes
- git state
- report freshness
- session state

## Delegation

`kavion_delegate` records a specialist handoff in worker state.

Use it to persist:

- delegation status (`spawned`, `completed`, `failed`, `needs_context`)
- specialist name
- summary
- files changed
- tests run
- risks and blockers
- next step
- downstream context for QA, security, review, or docs

Start a specialist-owned implementation step with `status: "spawned"`. While that specialist is active, AfterTool hook events are attributed to that owner. Ship and archive are blocked when required specialist handoffs or required implementation ownership evidence are missing.

Completed handoffs are validated by specialist role. Examples:

- implementation specialists must report `files_changed`
- `database-engineer` must include migration or rollback risk
- `qa-test-engineer` must include `tests_run`
- `security-engineer` must include findings or residual risk
- `task-planner` must include a next step

## Plan Steps

`kavion_plan_step_update` updates worker-backed plan-step progress.

Use it to persist:

- `step_index`
- `status`
- `owner_agent`
- `evidence`

Plan steps are rendered back into the plan markdown artifact, surfaced in status output, and checked by the plan and ship gates.

## Report Discipline

`kavion_report_create` is only for final evidence artifacts:

- `report:qa` -> `qa-<task>.md`
- `report:review` -> `review-<task>.md`
- `report:security` -> `security-<task>.md`

Execution-step logging does not belong in `reports/`. Use `kavion_plan_step_update` for step progress and `kavion_delegate` for specialist handoffs.

## Install

From `mcp-server/`:

```bash
npm install
npm run check
```

`/kavion:init-project` installs the worker Gemini hook set into project `.gemini/settings.json` and points those hooks at the same worker entrypoint:

- `SessionStart`
- `BeforeAgent`
- `BeforeTool`
- `AfterTool`
