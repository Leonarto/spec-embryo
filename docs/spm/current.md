+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-051 is active to promote Nexus coexistence guidance into structured adoption data for JSON-first callers."
focus = "Add structured Nexus coexistence guidance across shared adoption guidance and agent brief JSON."
active_spec_ids = ["SPEC-051"]
active_task_ids = ["TASK-107"]
blocked_task_ids = []
next_action_hints = ["Expose the existing Nexus coexistence guidance as shared data instead of recomputing it inside prose renderers.", "Flow the same Nexus coexistence guidance into `spm agent brief --json` and the short human brief.", "Keep the current coexistence wording and order intact so the change stays additive for existing readers."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T16:40:00Z"
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

`SPEC-051` is now active. Nexus coexistence guidance still exists only as prose in the migration and direct-agent surfaces, which means wrappers and JSON-first callers cannot reliably consume the bounded coexistence contract without scraping text. This slice promotes that coexistence guidance into shared structured adoption data so the short agent brief, doctor JSON, and human adoption artifacts all stay aligned from one field.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
