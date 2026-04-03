+++
doc_kind = "task"
id = "TASK-002"
title = "Derive deterministic status, resume context, and next actions"
summary = "Build the engine that links specs, tasks, current state, git data, blockers, and critical path."
status = "done"
spec_ids = ["SPEC-001"]
depends_on = ["TASK-001"]
blocked_by = []
priority = 1
owner_role = "planner"
tags = ["v1", "engine"]
updated_at = "2026-04-03T01:52:36.262Z"
+++

# Scope

Use explicit rules to compute what matters now, what is blocked, and what should happen next.

# Notes

Critical path can be simple in v1: longest unfinished dependency chain by declared task links.
