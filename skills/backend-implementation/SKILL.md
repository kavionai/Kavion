---
name: backend-implementation
description: Use this skill for backend APIs, services, auth, validation, integrations, background jobs, business logic, server-side bugs, and backend tests.
---
# Backend implementation

Use this skill for server-side implementation or backend bug fixes.

## Workflow

1. Read project memory and existing API/service patterns.
2. Locate routes, handlers, services, validation, auth, and tests.
3. Preserve existing API contracts unless the task explicitly changes them.
4. Follow existing error handling, logging, and validation patterns.
5. Add or update backend tests when behavior changes.
6. Run focused backend verification before broad suites.

## Checks

- Inputs are validated.
- Errors are handled consistently.
- Auth and authorization are preserved.
- External integrations are isolated or mocked in tests.
- Backwards compatibility is considered.

## Output

Return:

- Files changed
- API or behavior changed
- Tests added or run
- Compatibility impact
- Risks
