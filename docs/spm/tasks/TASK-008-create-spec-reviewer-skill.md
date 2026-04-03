+++
doc_kind = "task"
id = "TASK-008"
title = "Create the spec-reviewer skill for adversarial pre-implementation review"
status = "done"
summary = "Add a repo-local skill that reviews specs for ambiguity, missing branches, weak assumptions, and implementation risk before coding starts."
spec_ids = ["SPEC-003"]
depends_on = ["TASK-007"]
blocked_by = []
priority = 1
owner_role = "reviewer"
tags = ["specs", "skills", "review"]
updated_at = "2026-04-02T21:30:00Z"
+++

# Scope

Create the review-side workflow for agent-grade specs.

# Done Looks Like

- `skills/spec-reviewer/SKILL.md` exists
- the review output is structured and actionable
- the workflow feeds consequential unresolved decisions back to the user/fix loop
