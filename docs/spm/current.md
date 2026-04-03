+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-014 is complete after review. Seed tasks, direct closed-task creation, and status transitions now all preserve the intended lifecycle timestamp semantics."
focus = "Start TASK-015 to add archival and restore flows on top of the reviewed lifecycle metadata."
active_spec_ids = ["SPEC-005"]
active_task_ids = ["TASK-015"]
blocked_task_ids = []
next_action_hints = ["Implement archive and restore commands on top of created_at, completed_at, cancelled_at, archived_at, and archive_reason.", "Keep archived work durable while removing it from active-flow views by default.", "Leave TASK-016 blocked until the archive visibility rules are implemented in the repository and UI layers."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-03T02:46:51.402Z"
tags = ["v1", "self-hosting", "spec-workflow", "ui"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The repo is now recursive enough to carry its own managed roadmap and core workflows. The CLI can mutate status, create new spec/task docs with deterministic IDs and back-links, and treat `review` as a real task stage instead of a board-only placeholder. The local visual server still exposes the four-view workspace, now with a review-aware Kanban flow.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- The local visual server is read-only in v1 and should continue consuming shared deterministic services rather than inventing parallel parsing logic.
