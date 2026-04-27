+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-039 is complete after teaching broader adoption outputs to point at spm agent brief; the next adoption discoverability slice is ready to be chosen."
focus = "Choose the next adoption discoverability slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Pick the next adoption discoverability improvement from the shared agent-facing surfaces.", "Prefer reshaping existing wording and sections instead of adding another command surface.", "Keep direct command guidance and snippet guidance easy to distinguish."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T19:35:01.000Z"
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

SPEC-039 is now complete: the broader adoption and agent-facing surfaces point at `spm agent brief` as well as the snippet path, so users do not have to infer the direct workflow command only from concise doctor output. The next adjacent slice should improve structure, not add more commands: direct command guidance and external snippet guidance now coexist in the same sections, and separating those concepts would make the adoption outputs easier to scan.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
