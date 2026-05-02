---
name: project-memory-workflow
description: Use this skill to initialize, update, prune, or search Kavion project memory files such as KAVION.md, PROJECT.md, DECISIONS.md, CURRENT.md, notes, plans, reports, and the local BM25 index.
---
# Project memory workflow

Use this skill to maintain long-term project memory without wasting context.

## Memory tiers

- Hot memory: `KAVION.md`, `.kavion/CURRENT.md`, and `.kavion/session.json`
- Repo memory: `.kavion/PROJECT.md`
- Decision log: `.kavion/DECISIONS.md`
- Warm notes: `.kavion/notes/`
- Plans: `.kavion/plans/`
- Reports: `.kavion/reports/`
- Local index: `.kavion/index/`

## Workflow

1. Read `CURRENT.md` first.
2. Read `PROJECT.md` and `DECISIONS.md` only when the task needs them.
3. Keep live task state in the worker and let it render `session.json`.
4. Promote only durable repo truths into `PROJECT.md`.
5. Promote only real technical decisions into `DECISIONS.md`.
6. Keep detailed research or debugging in `notes/` only when it will be reused.
7. Keep multi-step roadmaps in `plans/`.
8. Keep only canonical QA, review, and security evidence in `reports/`.
   Execution progress belongs in plans, notes, or specialist handoffs instead.
9. Rebuild the local index after meaningful memory changes.

## Hygiene rules

- Keep `PROJECT.md` under 300 lines.
- Keep `CURRENT.md` under 50 lines.
- Do not duplicate the same fact across many files.
- Do not create notes for trivial one-off observations.
- Do not store secrets or PII in memory files.

## Local index rules

- Worker state plus rendered memory files are the source of truth.
- `.kavion/index/` is a rebuildable BM25 cache.
- Search results are hints; read the source file before relying on a recalled chunk.
