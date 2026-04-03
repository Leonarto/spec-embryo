---
name: agents-md-maintainer
description: Use when creating, updating, splitting, or pruning AGENTS.md files in this repo, especially after architecture, workflow, or folder-shape changes. Keeps AGENTS context concise, layered, and aligned with the local checker and token-budget policy.
---

# Agents MD Maintainer

Use this skill whenever work touches any `AGENTS.md` file or changes folder purpose enough that local agent guidance may become stale.

## Goal

Keep repo-local agent guidance accurate, small, and layered:

- root `AGENTS.md` holds cross-repo policy
- nested `AGENTS.md` files add only folder-local context
- detailed rationale lives in nearby docs or `references/`

## Workflow

1. Read the root `AGENTS.md`.
2. Read the nearest folder `AGENTS.md` for the area being changed.
3. Update only the files whose local context actually changed.
4. Remove duplicated guidance instead of restating root policy.
5. If AGENTS maintenance practice changed, update this skill too.
6. Run `bun run check:agents` or `bun run spm agents check`.

## Update triggers

Update relevant `AGENTS.md` files when any of these change:

- folder purpose
- important commands or entrypoints
- schema or document shape
- architectural boundaries
- workflows a future agent must follow
- file layout in a growing area

## Writing rules

- Prefer short bullets and direct instructions.
- Prefer file paths over long explanations.
- Keep examples rare.
- If a section starts reading like a mini-README, move detail elsewhere.
- Do not copy the same policy into multiple nested AGENTS files.

## Size policy

Follow the budgets in the root `AGENTS.md`. For rationale and current source links, read `references/token-budget.md`.

## Deterministic check

Run:

```bash
bun run check:agents
```

The checker uses approximate token counts, so treat it as a guardrail, not a tokenizer-perfect measurement.
