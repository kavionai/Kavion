# Changelog

## Unreleased

- Updated the SVG workflow and memory diagrams to match the ForgeKit 2 architecture.
- Tightened ForgeKit 2 session, plan, report, and note persistence rules.
- Added MCP helpers for updating CURRENT.md and writing structured plan/report files.

## 0.5.0 - 2026-04-23

- Reworked ForgeKit around the new ForgeKit 2 memory layout:
  - `.gemini/forgekit/PROJECT.md`
  - `.gemini/forgekit/DECISIONS.md`
  - `.gemini/forgekit/CURRENT.md`
  - `.gemini/forgekit/session.json`
  - `.gemini/forgekit/history.jsonl`
  - `.gemini/forgekit/gates.yaml`
  - `.gemini/forgekit/index/chunks.jsonl`
  - `.gemini/forgekit/index/bm25.json`
- Replaced the old LanceDB/vector memory cache with a local BM25 index.
- Added new MCP tools:
  - `forgekit_build_index`
  - `forgekit_search`
  - `forgekit_read_chunk`
  - `forgekit_status`
  - `forgekit_gate`
  - `forgekit_write_note`
  - `forgekit_memory_gc`
  - `forgekit_migrate`
- Added ForgeKit 2 slash commands under `/forge:*`.
- Kept compatibility aliases for older `/team:*` and legacy MCP tool flows.
- Added migration support from the old `.gemini/context/` and `sessions/active/` layout.
- Changed workflow enforcement to real gates based on command output and filesystem state.

## 0.4.1 - 2026-04-23

- Bumped patch version after the Standard workflow plan/report enforcement fix
  was merged to `main`.
- Kept extension, MCP package, lockfile, README badge, and changelog versions in
  sync.

## 0.4.0 - 2026-04-22

- Added workflow enforcement commands:
  - `/team:checkpoint`
  - `/team:workflow-audit`
  - `/team:handoff`
  - `/team:release-readiness`
- Added MCP workflow enforcement tools:
  - `forgekit_check_workflow`
  - `forgekit_record_checkpoint`
  - `forgekit_handoff_report`
  - `forgekit_release_readiness`
- Updated feature, orchestration, bug-fix, quality-gate, and archive workflows
  to require checkpoint/release-readiness decisions.
- Required persisted plan and report evidence for Standard work.
- Extended workflow checkpointing to block missing Standard-work plan/report
  files.
- Added workflow enforcement documentation.
- Added versioning policy and release checklist.
- Added README and memory-system diagram SVG assets for a more polished
  open-source project presentation.
- Bumped extension and MCP server versions to `0.4.0`.

## 0.3.0 - 2026-04-22

- Added optional local LanceDB memory backend with JSONL/hash-vector fallback.
- Added automatic memory index refresh requirements to feature, orchestration,
  bug-fix, memory-update, session-update, and init workflows.
- Added MCP tools:
  - `forgekit_compact_memory`
  - `forgekit_dashboard`
- Added `/team:dashboard` for memory, session, plan, report, and index status.
- Strengthened memory compaction guidance for completed sessions and oversized
  hot memory files.
- Added MCP setup documentation and backend mode configuration.
- Bumped extension and MCP server versions to `0.3.0`.

## 0.2.0 - 2026-04-22

- Added local memory index commands:
  - `/team:memory-index`
  - `/team:memory-search`
  - `/team:memory-audit`
  - `/team:memory-compact`
- Added MCP tools for local memory indexing, bounded memory search, and memory
  audit.
- Added local hash-vector recall cache under `.gemini/forgekit/memory/`.
- Kept Markdown memory files as the source of truth.
- Bumped extension and MCP server versions to `0.2.0`.

## 0.1.0 - 2026-04-21

- Added ForgeKit extension scaffold with agents, skills, commands, memory
  templates, and optional MCP server scaffold.
- Added `/team:session-update` for focused session-state maintenance.
- Tightened `/team:fix-issue` with bounded inspection and a memory/workflow
  fast path.
- Added project-memory session, plan, and report starter templates.
- Added contributor and architecture documentation.
