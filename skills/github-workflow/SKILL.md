---
name: github-workflow
description: Use this skill for GitHub issues, PRs, branches, commits, review comments, CI checks, release notes, issue triage, and GitHub MCP or gh CLI workflows.
---
# GitHub workflow

Use this skill for GitHub process work.

## Workflow

1. Identify the target issue, PR, branch, or review thread.
2. Prefer GitHub MCP tools when available.
3. Use `gh` only when MCP tools are unavailable or insufficient.
4. Summarize requirements, review comments, labels, CI state, and blockers.
5. Route implementation work to the correct engineer.
6. Prepare branch, commit, PR, and release summaries when requested.

## PR summary format

Use:

- Summary
- What changed
- Why
- Tests
- Risk
- Linked issue

## Safety

- Do not push, merge, or close issues without explicit approval.
- Do not hide dirty worktree state.
- Do not rewrite history unless explicitly requested.

## Output

Return:

- GitHub target summary
- Branch/status
- CI/review state
- Required next steps
- PR or release summary draft
