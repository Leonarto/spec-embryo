+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-031 is active. TASK-085 is in review after teaching resume context packs to say when changed-file detail was offloaded."
focus = "Review TASK-085 and keep resume context-pack truncation signaling explicit for changed files."
active_spec_ids = ["SPEC-031"]
active_task_ids = ["TASK-085"]
blocked_task_ids = []
next_action_hints = ["Review TASK-085 before moving it to done.", "Keep resume context packs explicit when changed files are compacted into offloaded detail.", "If review is clean, mark TASK-085 done and then close SPEC-031."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T04:45:00.000Z"
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

SPEC-030 is complete, and SPEC-031 is now at its first review gate. TASK-085 makes resume context packs explicitly say when changed-file detail was compacted out of the active slice and moved into offloaded inspection detail.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has seven coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, and an explicit resume context-pack note when additional changed files were moved into offloaded detail.
