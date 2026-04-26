+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-023 is done. Git short-status parsing now preserves correct relative paths, and the repo is ready for the next product slice."
focus = "Choose the next Spec Embryo product slice."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Choose the next managed spec and task before starting new implementation work.", "Keep git snapshot capture and changed-item derivation aligned as new status/reporting work lands."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T02:02:44.523Z"
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

The repo is now working on SPEC-021, which closes the gap between "a newer SpM version exists" and "agents actually refresh how they use SpM under that newer version." The immediate slice is TASK-075: doctor, init adoption artifacts, and the direct agent brief need to teach the current scoped-memory workflow explicitly and tell upgraded agents to refresh their usage policy when the installed CLI is newer than the repo's recorded tool version.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Scoped memory now has a first-class note lifecycle, so adoption and doctor guidance should steer agents toward `spm memory note`, `spm memory scopes`, and `spm memory consolidate` instead of raw scoped note-file edits.
