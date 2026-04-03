---
name: spec-writer
description: Use when creating or substantially rewriting a spec in this repo. Produces agent-grade specs that are optimized first for LLM implementation and review, and secondarily for human reading. Requires a write -> iterate core decisions with the user -> review -> fix workflow.
---

# Spec Writer

Use this skill when a feature, workflow, architecture change, or migration needs a real spec.

## Goal

Write specs that let an implementation agent work with minimal guessing while remaining readable to humans.

## Default workflow

1. Gather the current project context.
2. Read the relevant managed spec/task docs and nearby AGENTS files.
3. Draft the spec in a clear structured format.
4. Pause on the core decisions and iterate those with the human user.
5. Run the `spec-reviewer` workflow on the draft.
6. Fix the draft based on the review before finishing.

## Required rules

- Optimize for LLM implementation first and human readability second.
- Be explicit about goals, non-goals, invariants, actors, state transitions, and acceptance criteria.
- If a sentence implies a branch, write both sides.
- If a decision matters for implementation, make it explicit or surface it as an open question.
- Keep acceptance criteria testable and binary whenever possible.
- Do not stop after the first draft.

## Core-decision iteration

After the first real draft, identify the 1-4 decisions that would most affect implementation quality or scope. Bring those to the user concisely before treating the spec as final.

Good examples:

- scope cuts or non-goals
- architectural direction
- migration or compatibility choices
- workflow branches with product impact

## Default spec shape

Use this by default unless a smaller variant is clearly enough:

```md
# Title

## Overview

## Context

## Goals

## Non-Goals

## Constraints

## Proposed Approach

## Detailed Specification

## Edge Cases

## Acceptance Criteria

## Open Questions
```

## Reference

For the reasoning behind this structure and the distilled web research, read `references/spec-writing-principles.md`.
