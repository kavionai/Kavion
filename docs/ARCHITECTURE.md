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

### Templates

`templates/project-memory/` provides starter files for:

- root `GEMINI.md`
- hot memory files
- ForgeKit session, plan, and report files

### Policies

`policies/` contains workflow guardrails for risky actions.

### MCP Server

`mcp-server/` is optional. It is currently scaffolded, not required.

## Control Flow

Typical flow:

1. user runs a team command
2. coordinator reads memory and command instructions
3. coordinator picks the correct specialist
4. work is implemented or diagnosed
5. verification and review run
6. memory/session state is updated

## Current Design Constraint

The hardest part is not startup; it is later-phase convergence in complex bug
fix runs. That is why command instructions are intentionally strict about
bounded inspection and stopping conditions.
