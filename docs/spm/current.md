+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "All current managed implementation slices are complete; the repo is being prepared for the 0.2.0 npm publish."
focus = "Prepare 0.2.0 release"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Bump package version to 0.2.0.", "Run deterministic release checks plus bun publish --dry-run --access public.", "After the dry run passes, execute bun publish --access public."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T18:09:42.804Z"
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
