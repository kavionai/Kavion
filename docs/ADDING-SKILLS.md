# Adding Skills

Skills live in `skills/<name>/SKILL.md`.

## What A Skill Is

A skill is a procedural playbook. It should help the coordinator or an agent do
work in a repeatable way.

## Good Skill Shape

Each skill should answer:

- when it is used
- what steps it follows
- what output it should produce

## Keep Skills Practical

Good skills:

- start from a clear trigger
- give ordered steps
- say when to stop
- avoid generic advice

Bad skills:

- tell the model to "investigate more" with no limit
- restate obvious behavior
- duplicate command logic without adding concrete procedure

## Skill Frontmatter

At minimum:

- `name`
- `description`

## Relationship To Commands

Commands define workflow entry points. Skills support those workflows.

If a command keeps drifting, the fix is often:

- tighten the command
- tighten the skill
- or both

## Current Important Skills

- `project-memory-workflow`
- `session-state-workflow`
- `orchestration-workflow`
- `quality-gate`
