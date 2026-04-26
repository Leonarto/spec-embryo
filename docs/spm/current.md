+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-025 is complete after adding compact git change-type hints to changed-item summaries on top of the identity-plus-path reporting from SPEC-024."
focus = "Choose the next product slice and keep changed-item reporting stable across status, resume, and context-pack surfaces."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Choose the next managed spec/task slice before changing product direction again.", "Keep git change hints and identity-plus-path formatting consistent across status, deterministic backend, and context-pack summaries.", "If the next slice changes changed-item reporting again, update the shared formatter and regression tests together."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T02:37:18.000Z"
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

SPEC-025 is now complete. Changed-item summaries carry identity, path, and one normalized git change hint, and the immediate repo task is to choose the next product slice without regressing the shared status/resume/context-pack formatting contract that this thread established.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has two coupled presentation invariants: identity-plus-path formatting and one normalized git change hint shared across `spm status`, deterministic resume text, and compact context-pack summaries.
