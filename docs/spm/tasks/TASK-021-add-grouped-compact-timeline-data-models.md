+++
doc_kind = "task"
id = "TASK-021"
title = "Add grouped compact timeline data models"
summary = "Extend the deterministic timeline view model with spec grouping, compact row metadata, and an active-vs-completed display mode."
status = "done"
spec_ids = ["SPEC-007"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-03T15:30:21.198Z"
completed_at = "2026-04-03T15:36:32.456Z"
tags = ["ui", "gantt", "data"]
updated_at = "2026-04-03T15:36:32.456Z"
+++

# Scope

- Extend the deterministic timeline service with compact grouped rows keyed by spec.
- Add row metadata for status, effort, and dependency count.
- Support a display mode that can show active-only or include-completed rows without changing the underlying source-of-truth tasks.

# Done Looks Like

- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
