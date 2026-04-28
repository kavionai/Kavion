# Workflow Enforcement

Kavion uses real gates instead of lightweight checkpoint-only logic.

## Gate Surface

Use:

```text
/kavion:gate plan
/kavion:gate test
/kavion:gate review
/kavion:gate security
/kavion:gate ship
```

The older `/kavion:checkpoint` and `/kavion:release-readiness` commands remain as compatibility wrappers around the ship gate.

## What Gates Check

- `plan`
  - plan file exists
  - planner handoff exists
  - all required plan steps are complete

- `test`
  - configured test command runs
  - exit code is real
  - coverage can be checked if configured
  - QA evidence is not stale

- `review`
  - review report exists
  - review handoff exists
  - required sections exist
  - report is not stale

- `security`
  - only blocks for sensitive scope or explicit security configuration
  - requires security handoff and report when applicable
  - rejects stale security evidence

- `ship`
  - composes the other gates
  - checks required specialist handoffs
  - checks worker-observed implementation ownership
  - checks git cleanliness
  - checks branch safety

## Principle

Kavion should not trust:

- “tests passed” written by the model
- “review complete” written by the model
- “ready to ship” without command and file-state evidence
