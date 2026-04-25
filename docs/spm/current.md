+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-019 is active. TASK-069 is done, and spm now has a deterministic memory consolidation flow that promotes session notes into durable handoffs with duplicate, contradiction, related-doc, and staleness checks."
focus = "Start TASK-071 to improve retrieval ordering and section-level packing on top of the new context-pack and consolidation layers."
active_spec_ids = ["SPEC-019"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-071 by improving section-level evidence extraction and result ordering for memory packs and briefs.", "Keep the new consolidation outputs and scope labels stable while tightening retrieval assembly.", "Unblock TASK-072 only after TASK-071 defines a stable prompt-bundle ordering contract."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-25T23:38:57.370Z"
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
