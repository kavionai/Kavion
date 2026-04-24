---
name: execution-planning
description: Use this skill to break features, bugs, refactors, or GitHub issues into ordered engineering tasks, dependencies, specialist-agent handoffs, and verification steps.
---
# Execution planning

Use this skill when work needs more than one step or more than one specialist.

## Workflow

1. Classify the task: bug, feature, refactor, review, PR, CI, or docs.
2. Identify the smallest useful sequence of work.
3. Choose only the specialist agents needed.
4. Put investigation before implementation.
5. Put tests and review after implementation.
6. Keep the plan proportional to risk.
7. For Standard or multi-phase work, persist the plan under `.gemini/kavion/plans/` before implementation.
8. Prefer MCP tool `kavion_write_plan` when available.
9. Do not keep the only copy of the plan in chat text.

## Agent selection

- Product ambiguity: `product-manager`
- Technical design: `system-architect`
- Repo investigation: `codebase_investigator`
- UI/client work: `frontend-engineer`
- API/server work: `backend-engineer`
- Schema/query work: `database-engineer`
- LLM/tool workflow: `ai-automation-engineer`
- Verification: `qa-test-engineer`
- Security-sensitive work: `security-engineer`
- Final review: `code-reviewer`
- GitHub flow: `github-workflow-manager`

## Output

Return:

- Task type
- Recommended agents
- Ordered steps
- Dependencies
- Verification plan
- Risks
- Plan file path, when persisted
