+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-049 is active to promote source-material hints into structured guidance for JSON-first callers."
focus = "Add structured source-material hints across shared adoption guidance and agent brief JSON."
active_spec_ids = ["SPEC-049"]
active_task_ids = ["TASK-105"]
blocked_task_ids = []
next_action_hints = ["Expose the existing source-material hints as shared data instead of recomputing them inside prose renderers.", "Flow the same source-material hints into `spm agent brief --json` and the short human brief.", "Keep the fallback no-candidates hint intact so the change stays additive for fresh repos too."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T16:00:00Z"
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

`SPEC-049` is now active. Source-material guidance still exists only as prose in the migration and direct-agent surfaces, which means wrappers and JSON-first callers cannot reliably tell which docs or specs SpM wants inspected before migration work continues. This slice promotes those initial inspection hints into shared structured guidance so the short agent brief, doctor JSON, and human adoption artifacts all stay aligned from one field.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
