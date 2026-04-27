+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "TASK-090 is defining the bounded external AGENTS snippet that reuses the shared SpM workflow loop without taking over host repo instructions."
focus = "Define the next adoption slice after 0.2.0"
active_spec_ids = ["SPEC-034"]
active_task_ids = ["TASK-090"]
blocked_task_ids = []
next_action_hints = ["Define a short external AGENTS snippet around spm status, current.md, and conditional memory pack usage.", "Render the snippet from shared adoption guidance instead of hard-coding parallel wording.", "Keep the snippet optional and bounded so it coexists with host repo guidance."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T00:51:39.615Z"
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

The `0.2.0` memory and context work is complete, but the next adoption gap is now clearer: upgraded and newly-adopted agents can still miss the best SpM workflow because it is spread across doctor output, adoption artifacts, current state, and memory commands. SPEC-034 is the next planning slice for that problem, with the first goal being a single short operational loop that makes `spm status`, `docs/spm/current.md`, `spm memory pack`, and scoped-memory workflows easier to notice and use consistently.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
