+++
doc_kind = "task"
id = "TASK-018"
title = "Add shared deterministic detail-view data models"
summary = "Create a reusable detail service that resolves one spec or task with linked context, body sections, and deterministic not-found handling."
status = "done"
spec_ids = ["SPEC-006"]
depends_on = []
blocked_by = []
priority = 1
created_at = "2026-04-03T14:42:36.996Z"
completed_at = "2026-04-03T14:52:02.869Z"
tags = ["ui", "details", "data"]
updated_at = "2026-04-03T14:52:02.869Z"
+++

# Scope

- Add a shared deterministic service for spec and task detail payloads.
- Parse Markdown bodies into readable sections that can be rendered without route-local parsing.
- Resolve linked specs, tasks, current-state relevance, and recent handoff references in one reusable contract.

# Done Looks Like

- The expected behavior is implemented and verified.
- The linked project memory stays consistent.
