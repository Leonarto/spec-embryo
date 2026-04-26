+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-029 is active. TASK-083 is in review after adding omitted raw git-change counts to deterministic resume output when the Git Changes section is truncated."
focus = "Review TASK-083 and keep truncation signaling aligned across changed-item and raw git summary surfaces."
active_spec_ids = ["SPEC-029"]
active_task_ids = ["TASK-083"]
blocked_task_ids = []
next_action_hints = ["Review TASK-083 before moving it to done.", "Keep structured outputs unchanged while human-readable raw git summaries gain the truncation signal.", "If review is clean, mark TASK-083 done and then close SPEC-029."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T03:42:12.411Z"
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

SPEC-028 is complete, and SPEC-029 is now at its first review gate. TASK-083 makes the deterministic backend's raw Git Changes section explicitly say when additional short-status lines were omitted, just like the changed-item summaries now do.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has five coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, and an explicit omitted-count signal when human-visible summary slices are truncated.
