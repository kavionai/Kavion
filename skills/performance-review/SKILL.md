---
name: performance-review
description: Use this skill for performance checks involving slow pages, APIs, database queries, memory, bundle size, caching, concurrency, scalability, and cost.
---
# Performance review

Use this skill for performance regressions or optimization work.

## Workflow

1. Identify the slow path and user impact.
2. Separate frontend, backend, database, network, and infrastructure causes.
3. Look for measurement before optimization.
4. Prefer targeted fixes over broad rewrites.
5. Check for regressions in correctness and security.
6. Recommend verification commands or benchmarks.

## Review areas

- Frontend rendering, bundle size, loading states, and client caching.
- Backend algorithmic cost, IO, caching, and concurrency.
- Database query plans, indexes, N+1 queries, and migrations.
- External APIs, retries, rate limits, and timeouts.

## Output

Return:

- Performance hypothesis
- Evidence
- Recommended fix
- Verification plan
- Risks
