+++
doc_kind = "task"
id = "TASK-111"
title = "Build a user-local portfolio registry and status surfaces"
summary = "Add a deterministic portfolio registry plus list, status, and search surfaces across many SpM repositories."
status = "done"
spec_ids = ["SPEC-055"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:16:00Z"
completed_at = "2026-05-20T17:23:15.636Z"
tags = []
updated_at = "2026-05-20T17:23:15.636Z"
+++

# Scope

- Add a user-local portfolio registry for known SpM projects.
- Add deterministic portfolio list, status, and search surfaces.
- Surface project focus, health, and key managed-state summaries across repos.
- Add focused tests around stale or unavailable registry entries.

# Done Looks Like

- Users can inspect multiple SpM projects from one place.
- Portfolio surfaces remain deterministic and local-first.
- Missing or stale entries degrade gracefully instead of failing wholesale.
- Tests cover registry reading and cross-project summary rendering.
