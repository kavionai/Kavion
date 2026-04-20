---
name: accessibility-review
description: Use this skill for accessibility audits of UI, forms, navigation, semantics, keyboard behavior, focus states, ARIA, color contrast, and screen reader behavior.
---
# Accessibility review

Use this skill for UI work that affects users interacting through keyboard,
screen readers, zoom, or assistive technology.

## Workflow

1. Identify affected UI and user flow.
2. Check semantic structure and labels.
3. Check keyboard navigation and focus behavior.
4. Check form errors, status messages, and disabled states.
5. Check color contrast and text readability when possible.
6. Recommend tests or manual verification steps.

## Common checks

- Interactive elements have accessible names.
- Form fields have labels and useful error messages.
- Focus is visible and moves predictably.
- ARIA is used only when native semantics are insufficient.
- Dynamic changes are announced when needed.

## Output

Return:

- Accessibility findings
- Affected UI
- Recommended fixes
- Verification steps
- Residual risk
