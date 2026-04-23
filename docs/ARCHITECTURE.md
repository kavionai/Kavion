# Architecture

## Overview

ForgeKit uses the Gemini CLI main agent as the coordinator. The developer talks
to the coordinator. The coordinator chooses specialist agents, applies skill
guidance, reads project memory, and runs the relevant team command workflow.

## Main Parts

### Commands

`commands/team/` contains task entry points such as:

- orchestration
- bug fix
- feature work
- review
- quality gate
- session update
- memory update

Commands are the main workflow contract.

### Agents

`agents/` contains specialist roles:

- product-manager
- task-planner
- system-architect
- frontend-engineer
- backend-engineer
- database-engineer
- ai-automation-engineer
- qa-test-engineer
- security-engineer
- code-reviewer
- devops-docs-engineer
- github-workflow-manager

Each agent owns a bounded area.

### Skills

`skills/` contains procedural playbooks. Skills are guidance layers for:

- planning
- architecture
- implementation
- testing
- security
- quality gates
- project memory
- session state

### Project Memory

ForgeKit distinguishes:

- hot memory in `.gemini/context/`
- warm notes in `.gemini/notes/`
- cold archive in `.gemini/archive/`
- task-local session state in `.gemini/forgekit/`
- local searchable memory cache in `.gemini/forgekit/memory/`
- workflow enforcement gates for checkpoint, handoff, and release readiness

The memory cache supports two local modes:

- LanceDB when the optional `@lancedb/lancedb` package is installed
- JSONL/hash-vector fallback when native vector dependencies are unavailable

Markdown remains the source of truth; vector data is always rebuildable.

### Templates

`templates/project-memory/` provides starter files for:

- root `GEMINI.md`
- hot memory files
- ForgeKit session, plan, and report files

For Standard work, plans and reports are not optional:

- plans are stored under `.gemini/forgekit/plans/`
- QA, review, and security evidence is stored under `.gemini/forgekit/reports/`

### Policies

`policies/` contains workflow guardrails for risky actions.

### MCP Server

`mcp-server/` is optional. It provides session-state helpers, local memory
index/search/audit/compact tools, workflow enforcement tools, and a dashboard
when installed and enabled.

## Control Flow

Typical flow:

1. user runs a team command
2. coordinator reads memory and command instructions
3. coordinator picks the correct specialist
4. work is implemented or diagnosed
5. verification and review run
6. memory/session state is updated
7. local memory index is refreshed
8. workflow checkpoint runs
9. final response reports memory files, index refresh status, and checkpoint decision

## Current Design Constraint

The hardest part is not startup; it is later-phase convergence in complex bug
fix runs. That is why command instructions are intentionally strict about
bounded inspection and stopping conditions.

ForgeKit treats implementation-complete and release-ready as different states.
Deferred QA, missing review, unresolved blockers, or stale memory blocks handoff
and archive-as-complete.
Missing Standard-work plan/report files also block release readiness.
