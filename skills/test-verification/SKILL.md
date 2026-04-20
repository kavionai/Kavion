---
name: test-verification
description: Use this skill to reproduce bugs, design verification plans, write or run unit tests, integration tests, API tests, browser tests, end-to-end tests, and regression tests.
---
# Test verification

Use this skill whenever work needs proof, regression coverage, or release
confidence.

## Workflow

1. Read project testing memory and existing test patterns.
2. Identify the behavior that must be proven.
3. For bugs, reproduce the failure when practical.
4. Choose the smallest meaningful test level.
5. Add regression tests when the bug or feature changes behavior.
6. Run focused tests first, then broader checks if risk justifies it.

## Test levels

- Unit: isolated logic.
- Integration: service, database, API, or module boundaries.
- API: request/response contracts and validation.
- Browser/E2E: user-visible flows and regressions.
- Build/type/lint: release readiness.

## Output

Return:

- Test strategy
- Tests added or updated
- Commands run
- Results
- Remaining test gaps
