+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-030 is done: init now classifies adoption state and reports deterministic repo-inspection findings before seeding files. TASK-031 is the next slice."
focus = "Continue SPEC-010 with the read-only doctor flow"
active_spec_ids = ["SPEC-010"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Implement a read-only spm doctor command over the same layout inspection model.", "Keep migration suggestions explicit and permission-seeking.", "Reuse adoption findings so init and doctor do not diverge."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-03T18:51:08.402Z"
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

The repo is now recursive enough to carry its own managed roadmap and core workflows. The CLI can mutate status, create new spec/task docs with deterministic IDs and back-links, and treat `review` as a real task stage instead of a board-only placeholder. The local visual server still exposes the four-view workspace, and spec detail pages can now turn answered open questions into durable file-backed decisions instead of leaving them trapped in chat history.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- The local visual server should stay mostly read-only apart from narrow deterministic mutation flows such as answering spec open questions from the detail view.
