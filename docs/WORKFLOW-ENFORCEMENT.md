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
  - references real repo files

- `test`
  - configured test command runs
  - exit code is real
  - coverage can be checked if configured

- `review`
  - review report exists
  - required sections exist
  - report is not stale

- `security`
  - only triggers for sensitive paths
  - runs the configured security command

- `ship`
  - composes the other gates
  - checks git cleanliness
  - checks branch safety

## Principle

Kavion should not trust:

- “tests passed” written by the model
- “review complete” written by the model
- “ready to ship” without command and file-state evidence
