+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-006 is complete. The workspace now has dedicated spec and task detail pages backed by a shared deterministic detail service, with linked context, inline narrative rendering, and deterministic not-found states."
focus = "Choose the next product slice after closing SPEC-006."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Decide whether SPEC-007 compact Gantt or a follow-up workflow slice should be next.", "Consider fixing deterministic ID allocation so parallel spec/task creation cannot collide again.", "Keep the shared detail service and shared web components aligned as future detail pages or drill-down views grow."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-03T14:52:03.025Z"
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
