+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-019 is done. Spec Embryo now has compact context packs, scoped memory, consolidation, section-level retrieval ordering, deterministic memory evals, and cache-aware prompt bundle assembly across prompt-return and subprocess backends."
focus = "Choose the next product slice now that the full context-lifecycle roadmap in SPEC-019 is complete."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Review the finished SPEC-019 capabilities and decide what should follow the context-lifecycle roadmap.", "Use the spm memory eval command as a standing regression check for future context changes.", "If the next slice touches subprocess or prompt-return behavior, preserve the stable-prefix and variable-tail prompt contract."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T00:05:45.499Z"
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
