# Workflow Enforcement

ForgeKit workflow enforcement prevents false completion states.

The main rule:

```text
Implementation complete does not mean release-ready.
```

A task is not release-ready while any blocking gate remains.

## Gates

ForgeKit checks:

- project memory exists
- active session exists
- Standard/multi-phase work has a persisted plan file
- workflow phase and status are explicit
- blockers are resolved or explicitly deferred
- tests or verification passed
- QA is not deferred for release readiness
- QA/test report is written for Standard work
- code review completed
- code review report is written for Standard work
- security review completed for sensitive work
- security report is written for sensitive work
- memory index is present and current

Sensitive work includes auth, permissions, payments, secrets, tokens, user data,
and external input.

## Commands

- `/team:checkpoint`: check the active workflow gates
- `/team:workflow-audit`: inspect process compliance without implementation
- `/team:handoff`: prepare a strict handoff report
- `/team:release-readiness`: decide whether the task is ready for release, PR, or archive

## MCP Tools

- `forgekit_check_workflow`
- `forgekit_record_checkpoint`
- `forgekit_handoff_report`
- `forgekit_release_readiness`

## Decisions

Checkpoint commands return:

- `pass`: all required gates are satisfied
- `pass-with-risk`: work can continue, but risk is explicit
- `block`: do not hand off, release, or archive as complete

Release readiness returns:

- `ready`
- `not-ready`

## QA Deferred

QA deferred is allowed only as a risk state.

It must not be reported as fully complete or ready for use.

Correct:

```text
Implementation is complete, but release readiness is blocked by deferred QA.
Next command: /team:debug "Fix failing tests"
```

Incorrect:

```text
The API is ready for use. QA is deferred.
```

## Typical Flow

```text
/team:feature "Build ..."
/team:checkpoint
/team:quality-gate
/team:release-readiness
/team:archive
```

If the checkpoint blocks:

```text
/team:debug "Fix the blocking gate reported by /team:checkpoint"
```

## Plan And Report Files

For Standard work, ForgeKit expects durable evidence files:

```text
.gemini/forgekit/plans/<task-slug>-plan.md
.gemini/forgekit/reports/<task-slug>-qa.md
.gemini/forgekit/reports/<task-slug>-review.md
.gemini/forgekit/reports/<task-slug>-security.md
```

Express work may keep the plan and evidence inline in the active session.

Standard work should not finish with empty `plans/` or `reports/` folders
unless writes were blocked and the final response lists the deferred files.

## Archive Rule

Do not archive active work as complete until `/team:release-readiness` is ready.

Stale or paused sessions may still be archived when the user explicitly wants
to pause or move history out of active state, but they should not be marked as
release-ready.
