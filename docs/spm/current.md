+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-024 is active. TASK-078 is in review after improving human-facing changed-item reporting so managed changes carry both identity and concrete path across status-style text outputs."
focus = "Review TASK-078 and, if it is clean, close SPEC-024."
active_spec_ids = ["SPEC-024"]
active_task_ids = ["TASK-078"]
blocked_task_ids = []
next_action_hints = ["Run review on TASK-078 before closing SPEC-024.", "If review is clean, mark TASK-078 done and then close SPEC-024.", "Keep changed-item formatting consistent across status, deterministic backend, and context-pack summaries."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T02:07:19.594Z"
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

The repo is now working on SPEC-024, which tightens the human-facing side of changed-item reporting after the git short-status parser hardening in the previous slice. The immediate slice is TASK-078: status-style text outputs should show both the managed identity and the concrete relative path for changed docs so humans and agents can reconcile `spm` output against `git status` without guesswork.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item formatting now needs to stay consistent across `spm status`, deterministic resume text, and compact context-pack summaries whenever we adjust these human-facing surfaces.
