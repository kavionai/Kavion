# Changelog

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
