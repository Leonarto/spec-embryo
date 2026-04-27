+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-041 is complete after promoting direct agent command guidance into shared typed adoption data for JSON and renderer consumers."
focus = "Choose the next adoption or agent-guidance slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Capture the next meaningful adoption or agent-guidance improvement as a new spec/task slice before adding more wording variants.", "Prefer follow-on work that increases structured reuse or discoverability instead of duplicating the same guidance across more surfaces.", "Keep direct command guidance, snippet guidance, and JSON adoption outputs aligned from one shared contract."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T21:40:00.000Z"
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

The 0.3.0 release is out, and the queued follow-up slice is now complete as well. `SPEC-041` / `TASK-097` finished the structured-data follow-through to the earlier command-discoverability work by making direct agent commands part of the shared typed adoption contract and agent-brief JSON instead of leaving them as render-only text. The repo is back at a clean decision point for the next adoption or agent-guidance improvement.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
