+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-019 is active. TASK-070 is done, and spm now has a runnable memory eval harness that measures retrieval, pack, consolidation, and source-of-truth injection quality with deterministic scenario suites."
focus = "Start TASK-072 to add prompt-cache-aware backend bundle assembly on top of the now-stable context-pack ordering contract."
active_spec_ids = ["SPEC-019"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-072 by identifying which prompt-bundle sections are stable enough to become cache-friendly prefixes.", "Keep the new memory eval harness green while reshaping backend prompt assembly.", "Preserve the deterministic source-of-truth semantics while separating stable prefix material from volatile task-specific tails."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-25T23:53:50.409Z"
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
