+++
doc_kind = "task"
id = "TASK-016"
title = "Add spec-set and time-window filters for analytical task views"
summary = "Support deterministic filtering by one or more specs and by time window so timeline and analysis views can show full related work slices."
status = "done"
spec_ids = ["SPEC-005"]
depends_on = ["TASK-014", "TASK-015"]
blocked_by = []
priority = 2
owner_role = "planner"
completed_at = "2026-04-03T03:18:13.136Z"
tags = ["analysis", "filters", "timeline"]
updated_at = "2026-04-03T03:18:13.136Z"
+++

# Scope

- Add deterministic filtering for one or more selected specs.
- Add deterministic time-window filtering based on explicit lifecycle timestamps.
- Make analytical and timeline views capable of showing full related work slices, including archived tasks, for the selected spec set.

# Done Looks Like

- Timeline or analytical task views support filtering by one or more spec IDs.
- Time-window filters use lifecycle timestamps instead of `updated_at`.
- Multi-spec filtering includes shared tasks once and can surface archived work when the goal is slice analysis rather than active-board hygiene.
