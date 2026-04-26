+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-028 is complete after adding omitted changed-item counts to human summary surfaces when the visible list is truncated."
focus = "Choose the next product slice and keep changed-item reporting aligned across human summaries and structured consumers."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Choose the next managed spec/task slice before widening changed-item summary behavior again.", "Keep structured changed-item arrays in their original git-derived order.", "If the next slice touches human changed-item summaries again, update the shared truncation helper and the structured regressions together."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-26T03:31:55.000Z"
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

SPEC-028 is now complete. Human changed-item summaries explicitly say when the visible list is truncated, while structured changed-item arrays remain complete and unchanged.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has five coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, and an explicit omitted-count signal when those human summaries are truncated.
