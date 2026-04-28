+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-044 is complete after promoting workflow-loop commands into shared typed adoption guidance."
focus = "Choose the next adoption or agent-guidance slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Capture the next meaningful adoption or agent-guidance improvement as a new spec/task slice before adding more wording variants.", "Prefer follow-on work that increases structured reuse or discoverability instead of duplicating the same guidance across more surfaces.", "Keep workflow-loop guidance, doctor mode guidance, memory workflow guidance, and direct command guidance aligned from one shared contract."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T14:28:58Z"
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

`SPEC-044` is now complete. The adoption contract exposes a typed `workflowLoop.commands` list beside the existing prose steps, and that shared command data now flows through `doctor --json`, `spm agent brief --json`, the migration guide, and the direct agent brief. The healthy, missing, and unreadable current-state branches are all preserved in the structured contract, so JSON-first consumers no longer lose the checkpoint step that human readers already relied on.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
