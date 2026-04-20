# Adding Agents

Agents live in `agents/` as Markdown files with YAML frontmatter.

## Minimum Structure

Each agent file should include:

- `name`
- `description`
- `kind`
- `tools`
- `model`
- `temperature`
- `max_turns`
- `timeout_mins`

Then define:

- role
- responsibilities
- boundaries
- working rules
- output format

## Design Rules

- Give the agent one clear ownership area.
- Define what it should not do.
- Avoid overlapping with existing agents unless the overlap is intentional.
- Keep output format predictable for handoff back to the coordinator.

## Good Agent Shape

A good agent:

- knows what files it should usually touch
- knows when to hand off
- knows what verification it is expected to report

## Common Mistakes

- vague role description
- no boundaries
- too many responsibilities
- no output contract
- agent README files inside `agents/` that are not actual agents

Every Markdown file in `agents/` may be treated as an agent, so only put real
agent definitions there.
