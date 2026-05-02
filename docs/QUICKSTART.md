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

Kavion commands:

```text
/kavion:init-project
/kavion:status
/kavion:gate ship
/kavion:migrate
/kavion:search "current task"
```
