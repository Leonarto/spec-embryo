+++
doc_kind = "task"
id = "TASK-020"
title = "Build the task detail route and navigation"
summary = "Add a dedicated task detail page with dependency context, archival visibility, and graceful not-found fallback."
status = "done"
spec_ids = ["SPEC-006"]
depends_on = ["TASK-018"]
blocked_by = []
priority = 1
created_at = "2026-04-03T14:42:36.994Z"
completed_at = "2026-04-03T14:52:03.025Z"
tags = ["ui", "details", "tasks"]
updated_at = "2026-04-03T14:52:03.025Z"
+++

# Scope

- Add a dedicated task detail route keyed by task ID.
- Render dependencies, blocker state, linked specs, lifecycle metadata, and body sections from the shared detail service.
- Make current workspace views link naturally into task detail pages and show deterministic not-found fallback.

# Done Looks Like

- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
