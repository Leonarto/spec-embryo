+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-037 is complete after making concise doctor output point callers at spm agent snippet; the next adoption discoverability slice is ready to be chosen."
focus = "Choose the next adoption discoverability slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Pick the next adoption discoverability improvement from the agent-facing command surfaces.", "Prefer another small shared-wording slice instead of opening a new workflow branch.", "Keep doctor, agent brief, and agent snippet discoverable without duplicating instruction layers."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T14:45:12.000Z"
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

SPEC-037 is now complete: concise `spm doctor` output points at `spm agent snippet` using the same shared adoption wording already used by the broader guides and briefs. That closes the narrow bounded-guidance discoverability gap. The repo is ready to open the next adjacent adoption slice, ideally another small command-discoverability improvement that reuses shared wording instead of expanding the workflow surface.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
