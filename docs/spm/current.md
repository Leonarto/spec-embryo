+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-097 is in review after promoting direct agent command guidance into shared typed adoption data so JSON and renderer consumers stay aligned."
focus = "Expose direct agent commands in structured adoption guidance"
active_spec_ids = ["SPEC-041"]
active_task_ids = ["TASK-097"]
blocked_task_ids = []
next_action_hints = ["Review the new directAgentCommands structured field across adoption guidance and agent brief JSON.", "Confirm the renderers are consuming shared data instead of recomputing the direct-command section.", "Keep snippet content, direct command guidance, and JSON guidance aligned."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T21:32:00.000Z"
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

The 0.3.0 release is now published, so the repo focus returns to the next adoption data-structure slice. `TASK-097` is the active review gate: direct agent command guidance now exists as shared typed adoption data and in agent-brief JSON, not just in human-rendered text. This slice should be validated as the structured-data follow-through to the earlier command-discoverability work before the next adoption guidance refinement is chosen.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
