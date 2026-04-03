---
name: spec-reviewer
description: Use after drafting or materially changing a spec in this repo. Reviews the spec for ambiguity, missing branches, weak assumptions, and implementation risk, then drives a revise/fix loop before the spec is treated as ready.
---

# Spec Reviewer

Use this skill after drafting or substantially updating a spec.

## Goal

Reduce implementation risk before coding starts by finding ambiguity, missing behavior, weak assumptions, and gaps in testability.

## Review workflow

1. Read the whole spec.
2. Read nearby managed tasks, AGENTS files, and relevant context docs as needed.
3. Review for clarity, completeness, feasibility, consistency, edge cases, and testability.
4. Extract assumptions explicitly.
5. Produce concrete findings with suggested fixes.
6. Revise the spec or direct a revision before the workflow is considered complete.

## Things to attack

- hidden assumptions
- missing unhappy paths
- undocumented branch conditions
- vague wording
- actor-less passive voice
- missing state transitions
- missing migration or compatibility notes
- unclear acceptance criteria
- over-engineering compared to the stated problem

## Output expectation

Prefer this structure:

```md
# Review: <spec title>

**Status:** APPROVED | REVISE | BLOCKED

## Assumptions

## Findings

### GAP-1: <title>
**Dimension:** ...
**Severity:** RED | YELLOW
**Problem:** ...
**Impact:** ...
**Suggested fix:** ...

## Questions

## Recommendation
```

## Required rules

- Focus on behavior, logic, and implementation risk over style nitpicks.
- Every non-trivial finding should include a suggested fix.
- If the spec is good, say so clearly.
- If the review uncovers a consequential unresolved decision, bring that back to the human user instead of guessing.

## Reference

For the review lens and source rationale, read `references/spec-review-principles.md`.
