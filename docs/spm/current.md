+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-020 is active. TASK-073 is in review after adding first-class CLI create/update flows for scoped memory notes with deterministic IDs and write-policy enforcement."
focus = "Review and, if needed, fix TASK-073 before starting the archive/list follow-up in TASK-074."
active_spec_ids = ["SPEC-020"]
active_task_ids = ["TASK-073"]
blocked_task_ids = []
next_action_hints = ["Run review on TASK-073 before extending the note workflow further.", "If review is clean, mark TASK-073 done and then start TASK-074 for archive and note-centric inspection flows.", "Keep the new memory note commands aligned with scope write policy and repository lock invariants."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T00:25:29.351Z"
tags = ["v1", "self-hosting", "spec-workflow", "context"]
+++

# Current State

This file is the explicit checkpoint for interrupted work. It should answer:

- what the project is trying to do right now
- which specs and tasks are active
- what should happen next
- what is blocked
- where a future human or agent should resume

## Narrative

The repo is now recursive enough to carry its own managed roadmap and core workflows. SPEC-019 is the active planning slice and defines how Spec Embryo should improve context lifecycle and packaging without drifting into a hidden second assistant. The CLI can mutate status, create new spec/task docs with deterministic IDs and back-links, and now serializes concurrent create flows so task/spec IDs no longer collide under parallel work.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- The local visual server should stay mostly read-only apart from narrow deterministic mutation flows such as answering spec open questions from the detail view.
