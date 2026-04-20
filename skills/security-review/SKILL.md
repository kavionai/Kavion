---
name: security-review
description: Use this skill for security review of auth, authorization, secrets, payments, user data, external input, injection risks, dependencies, privacy, and unsafe file or network operations.
---
# Security review

Use this skill when changes touch sensitive behavior or external input.

## Workflow

1. Identify assets, trust boundaries, and user-controlled input.
2. Trace data flow through validation, auth, storage, and output.
3. Check for practical exploit paths, not theoretical noise.
4. Separate confirmed findings from assumptions.
5. Recommend concrete fixes and tests.
6. State residual risk.

## Review checklist

- Authentication and authorization are enforced server-side.
- Secrets are not logged, committed, or exposed to clients.
- Input validation and output encoding are appropriate.
- Database queries avoid injection risks.
- File and network operations are constrained.
- Payment and user-data flows avoid unsafe leakage.

## Output

Return:

- Security assessment
- Findings ordered by severity
- Evidence
- Recommended fixes
- Residual risk
