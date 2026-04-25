+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-019 is active. TASK-071 is done, and spm now promotes section-level evidence earlier in memory briefs and context packs so agents can start from smaller, stronger slices before opening whole documents."
focus = "Start TASK-070 to add deterministic context and memory evaluation harnesses on top of the new packing, scope, consolidation, and retrieval-ordering layers."
active_spec_ids = ["SPEC-019"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-070 by defining eval fixtures and metrics for retrieval, packing, and consolidation quality.", "Reuse the new section-level evidence and consolidation outputs as observable signals in the eval suite.", "Keep TASK-072 blocked until cache-aware bundle assembly can build on the now-stable ordering contract from TASK-071."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-25T23:43:48.406Z"
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
