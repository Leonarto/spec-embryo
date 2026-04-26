+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-026 is complete after preserving compact raw git status codes in structured changed-item data while keeping human summaries compact and normalized."
focus = "Choose the next product slice and keep changed-item reporting aligned across human summaries and structured consumers."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Choose the next managed spec/task slice before widening the changed-item surface again.", "Keep human-facing changed-item summaries unchanged while structured outputs preserve git nuance.", "If the next slice touches changed-item ordering or display, update the shared formatter and structured regressions together."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T02:59:06.353Z"
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

SPEC-026 is now complete. Changed-item data preserves both the normalized human-facing hint and the compact raw git status code, so structured consumers can distinguish mixed states like `MD` without making the shared human summaries noisier.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has three coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, and one compact raw `statusCode` for structured consumers.
