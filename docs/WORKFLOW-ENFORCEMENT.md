# Workflow Enforcement

ForgeKit 2 uses real gates instead of lightweight checkpoint-only logic.

## Gate Surface

Use:

```text
/forge:gate plan
/forge:gate test
/forge:gate review
/forge:gate security
/forge:gate ship
```

The older `/team:checkpoint` and `/team:release-readiness` commands remain as compatibility wrappers around the ship gate.

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

ForgeKit should not trust:

- “tests passed” written by the model
- “review complete” written by the model
- “ready to ship” without command and file-state evidence
