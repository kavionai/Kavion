---
name: architecture-design
description: Use this skill for technical design, API design, integration boundaries, data flow, module structure, refactor strategy, and architecture decisions before coding.
---
# Architecture design

Use this skill for non-trivial technical choices. Do not use it for simple
single-file fixes.

## Workflow

1. Read project memory and relevant existing patterns.
2. Describe the current system shape before proposing changes.
3. Define the target design in terms of modules, data flow, APIs, and ownership.
4. Prefer incremental, reversible changes.
5. Identify migration, compatibility, and operational risks.
6. Recommend tests and rollout checks.

## Decision rule

Add a decision note only when the choice changes architecture, dependencies,
data model, security posture, or operational behavior.

## Output

Return:

- Current state
- Proposed design
- Affected areas
- Tradeoffs
- Implementation sequence
- Verification strategy
- Decision note candidate
