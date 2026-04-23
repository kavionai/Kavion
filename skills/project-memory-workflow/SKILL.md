---
name: project-memory-workflow
description: Use this skill to initialize, update, prune, or search ForgeKit 2 project memory files such as GEMINI.md, PROJECT.md, DECISIONS.md, CURRENT.md, notes, plans, reports, and the local BM25 index.
---
# Project memory workflow

Use this skill to maintain long-term project memory without wasting context.

## Memory tiers

- Hot memory: `GEMINI.md`, `.gemini/forgekit/CURRENT.md`, and `.gemini/forgekit/session.json`
- Repo memory: `.gemini/forgekit/PROJECT.md`
- Decision log: `.gemini/forgekit/DECISIONS.md`
- Warm notes: `.gemini/forgekit/notes/`
- Plans: `.gemini/forgekit/plans/`
- Reports: `.gemini/forgekit/reports/`
- Local index: `.gemini/forgekit/index/`

## Workflow

1. Read `CURRENT.md` first.
2. Read `PROJECT.md` and `DECISIONS.md` only when the task needs them.
3. Sync live task state into `session.json`.
4. Promote only durable repo truths into `PROJECT.md`.
5. Promote only real technical decisions into `DECISIONS.md`.
6. Keep detailed research or debugging in `notes/` only when it will be reused.
7. Keep multi-step roadmaps in `plans/`.
8. Keep gate evidence in `reports/`.
9. Rebuild the local index after meaningful memory changes.

## Hygiene rules

- Keep `PROJECT.md` under 300 lines.
- Keep `CURRENT.md` under 50 lines.
- Do not duplicate the same fact across many files.
- Do not create notes for trivial one-off observations.
- Do not store secrets or PII in memory files.

## Local index rules

- Files are the source of truth.
- `.gemini/forgekit/index/` is a rebuildable BM25 cache.
- Search results are hints; read the source file before relying on a recalled chunk.
