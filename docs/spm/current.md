+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-033 is active. TASK-087 is in review after adding typed next-inspect entries to context-pack bundles while preserving legacy nextInspectIds."
focus = "Review TASK-087 and keep typed context-pack expansion trails aligned with legacy nextInspectIds."
active_spec_ids = ["SPEC-033"]
active_task_ids = ["TASK-087"]
blocked_task_ids = []
next_action_hints = ["Review TASK-087 before moving it to done.", "Keep typed nextInspect entries and legacy nextInspectIds aligned across memory and resume context packs.", "If review is clean, mark TASK-087 done and then close SPEC-033."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T05:25:00.000Z"
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

SPEC-032 is complete, and SPEC-033 is now at its first review gate. TASK-087 adds typed `nextInspect` entries to context-pack bundles so prompt-return callers can distinguish managed-document expansion targets from changed-file paths without reparsing the legacy flat string list.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
