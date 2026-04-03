+++
doc_kind = "task"
id = "TASK-007"
title = "Create the spec-writer skill for agent-grade spec authoring"
status = "done"
summary = "Add a repo-local skill that writes implementation-ready specs, requires iteration on core decisions with the human user, and optimizes for LLM use first."
spec_ids = ["SPEC-003"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "planner"
tags = ["specs", "skills", "workflow"]
updated_at = "2026-04-02T21:30:00Z"
+++

# Scope

Create the writing-side workflow for agent-grade specs.

# Done Looks Like

- `skills/spec-writer/SKILL.md` exists
- it requires a draft -> user iteration -> review -> fix loop
- it uses a structure that is implementation-ready for LLM agents
