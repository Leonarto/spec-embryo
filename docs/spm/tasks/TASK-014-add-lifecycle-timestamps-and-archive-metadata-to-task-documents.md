+++
doc_kind = "task"
id = "TASK-014"
title = "Add lifecycle timestamps and archive metadata to task documents"
summary = "Extend the task model so completion, cancellation, and archival decisions use explicit timestamps instead of generic document edit time."
status = "done"
spec_ids = ["SPEC-005"]
depends_on = []
blocked_by = []
priority = 1
owner_role = "builder"
completed_at = "2026-04-03T02:46:51.406Z"
tags = ["archival", "model", "timestamps"]
updated_at = "2026-04-03T02:46:51.406Z"
+++

# Scope

- Extend the task frontmatter model with lifecycle and archival fields.
- Write `created_at` when a task is created.
- Write `completed_at` or `cancelled_at` when task status transitions reach those lifecycle states.
- Keep these timestamps distinct from `updated_at`.

# Done Looks Like

- Task parsing and serialization support lifecycle metadata deterministically.
- `task create` writes `created_at`.
- `task set-status` writes `completed_at` for `done` and `cancelled_at` for `cancelled`.
- Repository tests cover the new lifecycle fields.
