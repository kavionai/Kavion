---
name: database-change
description: Use this skill for schema changes, migrations, indexes, constraints, ORM models, persistence logic, query bugs, database performance, and migration safety.
---
# Database change

Use this skill for database or persistence work. Treat production data as
high-risk.

## Workflow

1. Inspect current schema, migrations, models, queries, and database commands.
2. Prefer additive, backwards-compatible changes.
3. Consider existing production data and rollback path.
4. Keep migrations small and explicit.
5. Add persistence tests when behavior changes.
6. Document manual deploy or migration steps.

## Safety checks

- No destructive migration without explicit approval.
- Indexes match query patterns.
- Constraints match application validation.
- Migrations can run from current production state.
- Rollback or forward-fix path is clear.

## Output

Return:

- Files changed
- Schema/query behavior changed
- Migration safety notes
- Tests or checks run
- Rollout risks
