+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-018 and TASK-065 are done, and SPEC-019 is now active to improve context lifecycle and context-pack optimization so spm can package repo knowledge more effectively for Codex, Claude, and deterministic-only workflows without duplicating model-native reasoning."
focus = "Define and implement the first context-lifecycle slice after the one-step Nexus setup work, starting with deterministic context-pack planning and compaction."
active_spec_ids = ["SPEC-019"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-067 by defining the first deterministic context-pack shape, compaction rules, and output contract.", "Decide the first context-pack surface area before adding scoped memory or consolidation flows.", "Keep future context work focused on durable packaging, scopes, consolidation, and evals instead of rebuilding model-native reasoning."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-25T22:52:00.000Z"
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
