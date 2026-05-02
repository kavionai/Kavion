# Changelog

## 0.5.0 - 2026-05-03

- Made `/kavion:feature` the default user entrypoint for serious feature work by documenting and enforcing internal session bootstrap.
- Kept `/kavion:start` as an optional advanced command for explicit session control instead of a mandatory first step.
- Updated README, quickstart, architecture, MCP, and workflow guidance so new users are not forced through extra session-start ceremony.

## 0.4.1 - 2026-04-29

- Fixed report artifact discipline so only canonical QA, review, and security reports belong under `.kavion/reports/`.
- Renamed worker-generated reports to `qa-<task>.md`, `review-<task>.md`, and `security-<task>.md` for cleaner layout.
- Added report payload validation to reject execution-step logging disguised as reports and require stronger QA/review/security evidence.
- Tightened stale command prompts and skills that still encouraged loose session/report handling.

## 0.4.0 - 2026-04-29

- Added active implementation ownership enforcement through `BeforeTool`, so rendered views and SQLite state cannot be hand-edited and Standard code work must run inside an active specialist ownership window.
- Added worker-backed plan step tracking through `kavion_plan_step_update`, including owner agents, evidence, progress rendering, and plan-step completion checks in the plan gate.
- Tightened specialist evidence rules with required handoff fields, worker-observed implementation ownership checks, stale QA/review/security evidence checks, and stronger ship/archive blocking.
- Expanded specialist routing for architecture, frontend, AI automation, DevOps/docs, GitHub workflow, and product requirements scope.
- Improved idle-session rendering so `CURRENT.md` and `session.json` surface the last completed task instead of looking like work disappeared.

## 0.3.0 - 2026-04-28

- Added worker-backed `kavion_delegate` specialist handoffs so required team work is recorded structurally instead of relying on prompt intent alone.
- Surfaced delegation summaries and handoff gaps in rendered session state and status output.
- Tightened plan, review, security, ship, and archive behavior so completion is blocked when required specialist handoffs or required evidence are missing.
- Updated orchestration prompts, handoff guidance, and MCP docs for the stronger team runtime.

## 0.2.4 - 2026-04-27

- Fixed `/kavion:start` so it is a strict session-bootstrap flow rather than an implementation command.
- Tightened standard-work orchestration so medium and larger feature flows require planner-led setup and specialist delegation policy in hot context.
- Added required-specialist guidance to rendered session state and post-plan next steps.

## 0.2.3 - 2026-04-27

- Fixed installed-extension MCP startup by vendoring the worker runtime inside the repo.
- Removed the runtime dependency on `node_modules` under `~/.gemini/extensions/kavion`.
- Kept the workspace-path binding from `0.2.2` so installed copies start in the real project workspace.

## 0.2.2 - 2026-04-27

- Fixed the extension MCP server to bind to the active Gemini workspace using `${workspacePath}`.
- Added explicit `KAVION_WORKSPACE_PATH` injection in the manifest so worker-backed `.kavion/*` files are created in the real project, not the extension install directory.

## 0.2.1 - 2026-04-25

- Fixed extension MCP packaging so Gemini can launch the installed worker from a root-level dependency install.
- Switched the manifest to the documented `${extensionPath}${/}...` path format and a dedicated launcher entrypoint.
- Suppressed the `node:sqlite` experimental warning for worker startup and added Gemini project-dir env fallback.

## 0.2.0 - 2026-04-25

- Reworked Kavion state management around `.kavion/state.db` as machine truth.
- Added worker-backed session start and phase transition tools.
- Made `.kavion/CURRENT.md` and `.kavion/session.json` rendered views instead of writable state files.
- Added project hook installation for Gemini `SessionStart`, `BeforeAgent`, and `AfterTool`.
- Added compatibility wrappers so the older command prompts still function during migration.
- Updated docs and templates for the SQLite-backed memory architecture.

## 0.1.0 - 2026-04-24

- Initial public release of Kavion.
- Added a unified `/kavion:*` command namespace for project setup, implementation, review, status, search, migration, and workflow control.
- Added local-first memory under `.kavion/` with `PROJECT.md`, `DECISIONS.md`, `CURRENT.md`, `session.json`, `history.jsonl`, plans, reports, notes, and a rebuildable BM25 index.
- Added MCP tools for workspace initialization, session updates, current-state updates, plan/report/note writes, search, migration, memory hygiene, and real workflow gates.
- Added specialist agents, workflow skills, templates, SVG diagrams, and project documentation.
