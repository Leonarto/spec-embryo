+++
doc_kind = "task"
id = "TASK-012"
title = "Add a deterministic Gantt-style timeline view"
summary = "Display tasks in a timeline using dependency order and default effort values without requiring date estimates."
status = "done"
spec_ids = ["SPEC-004"]
depends_on = ["TASK-011"]
blocked_by = []
priority = 1
owner_role = "planner"
tags = ["ui", "timeline", "gantt"]
updated_at = "2026-04-03T00:48:52.869Z"
+++

# Scope

Add a timeline view that is useful now without pretending to know real schedule dates.

# Done Looks Like

- tasks render on a horizontal timeline
- timeline widths come from deterministic effort defaults
- dependency order influences bar position
- no date estimation is required for the view to work
