+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-032 is active. TASK-086 is in review after teaching resume context packs to promote offloaded changed files into next-inspect guidance."
focus = "Review TASK-086 and keep resume context-pack expansion trails aligned with offloaded changed-file detail."
active_spec_ids = ["SPEC-032"]
active_task_ids = ["TASK-086"]
blocked_task_ids = []
next_action_hints = ["Review TASK-086 before moving it to done.", "Keep resume context-pack next-inspect guidance aligned with the highest-value offloaded changed files.", "If review is clean, mark TASK-086 done and then close SPEC-032."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T05:05:00.000Z"
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

SPEC-031 is complete, and SPEC-032 is now at its first review gate. TASK-086 makes resume context packs carry the highest-value offloaded changed-file refs into `nextInspectIds`, so prompt-return callers get an explicit expansion trail instead of only a summary note.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has eight coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, and a matching `nextInspectIds` trail for the highest-value omitted changed files.
