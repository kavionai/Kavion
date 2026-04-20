---
name: ai-automation-workflow
description: Use this skill for prompts, Gemini CLI extensions, MCP servers, agent workflows, tool integrations, embeddings, retrieval, LLM features, and automation scripts.
---
# AI automation workflow

Use this skill for agentic workflows, LLM features, prompts, tools, and MCP
integration work.

## Workflow

1. Identify the automation boundary: prompt, command, skill, agent, MCP tool, or script.
2. Prefer deterministic structure over vague prompting.
3. Define input and output contracts.
4. Keep prompts concise and role-specific.
5. Avoid storing secrets in prompts, config, memory, or examples.
6. Add examples or lightweight tests for workflow behavior when practical.

## Design checks

- The workflow has a clear trigger.
- The output format is explicit.
- Failure modes are visible.
- The system can be debugged without reading huge logs.
- Manual approval gates exist for risky actions.

## Output

Return:

- Files changed
- Workflow behavior changed
- Tool/MCP impact
- Verification performed
- Reliability risks
