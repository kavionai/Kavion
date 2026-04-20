---
name: frontend-implementation
description: "Use this skill for frontend UI work: pages, components, forms, routing, browser behavior, client state, styling, accessibility, frontend tests, and UI regressions."
---
# Frontend implementation

Use this skill for client-side implementation or frontend bug fixes.

## Workflow

1. Read project memory and existing UI patterns.
2. Locate relevant pages, components, state, routes, and tests.
3. Reuse existing components, hooks, utilities, styles, and design tokens.
4. Keep the change focused on the requested behavior.
5. Add or update frontend tests when behavior changes.
6. Run the smallest relevant frontend verification first.

## Checks

- UI behavior matches acceptance criteria.
- Text fits and state changes do not shift layout unexpectedly.
- Forms handle loading, error, success, and disabled states.
- Client API calls handle failure cases.
- Accessibility is not regressed.

## Output

Return:

- Files changed
- UI behavior changed
- Tests added or run
- Accessibility notes
- Remaining risks
