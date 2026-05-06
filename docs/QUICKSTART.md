# Quick Start

Link the extension:

```bash
gemini extensions link .
```

Validate:

```bash
gemini extensions validate .
npm --prefix mcp-server run check
```

Inside Gemini CLI:

```text
/kavion:init-project
/kavion:feature "Build a small API"
/kavion:status
/kavion:gate ship
```

Use `/kavion:feature` as the normal entrypoint. It auto-starts or resumes the worker-backed session. `/kavion:start` is optional and mainly useful when you want explicit session control before implementation.

Kavion creates `.kavion/` lazily. Starting Gemini alone should not create project state. `.kavion/` is created when you run `/kavion:init-project` or enter serious work through `/kavion:feature`. Gemini itself may still create `.gemini/`.

Primary Kavion commands:

```text
/kavion:init-project
/kavion:feature "Build ..."
/kavion:fix-issue "Fix ..."
/kavion:review
/kavion:status
/kavion:resume
/kavion:gate ship
/kavion:archive
/kavion:migrate
/kavion:search "current task"
```
