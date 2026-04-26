+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-020 is active. TASK-074 is in review after adding deterministic archive, restore, and list workflows for scoped memory notes."
focus = "Review TASK-074 and, if it is clean, close SPEC-020 and choose the next roadmap slice."
active_spec_ids = ["SPEC-020"]
active_task_ids = ["TASK-074"]
blocked_task_ids = []
next_action_hints = ["Run review on TASK-074 before closing SPEC-020.", "If review is clean, mark TASK-074 done and then close SPEC-020.", "Keep the memory note lifecycle aligned with scope write-policy, retrieval, consolidation, and eval invariants."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T00:39:50.000Z"
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

The repo is currently closing out SPEC-020, which turns scoped `memory-note` documents into a first-class CLI workflow instead of a file format that only power users can edit by hand. TASK-073 landed deterministic note creation and update flows, and TASK-074 now adds archive, restore, and note-centric listing so the lightweight scoped-memory layer can be managed end to end without raw file edits.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- The scoped memory-note lifecycle now includes create, update, archive, restore, and list flows; consolidation remains the explicit promotion path from session notes into durable repo memory.
