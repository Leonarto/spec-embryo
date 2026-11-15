+++
doc_kind = "task"
id = "TASK-117"
title = "Add bounded repo-event automation hooks"
summary = "Introduce opt-in deterministic hooks around selected git, CI, and release lifecycle events to reduce managed-memory drift."
status = "done"
spec_ids = ["SPEC-058"]
depends_on = []
blocked_by = []
priority = 2
created_at = "2026-05-20T22:22:00Z"
completed_at = "2026-05-20T17:23:38.987Z"
tags = []
updated_at = "2026-05-20T17:23:38.987Z"
+++

# Scope

- Add an opt-in hook layer for bounded repo lifecycle events.
- Support deterministic guidance or updates after selected git, CI, or release events.
- Keep hook behavior inspectable and approval-aware.
- Add tests for enabled, disabled, and degraded hook environments.

# Done Looks Like

- SpM can reduce drift after common repo events without hidden automation.
- Hook behavior remains local-first and opt-in.
- Human approval remains explicit where required.
- Tests cover core hook branches and failure handling.
