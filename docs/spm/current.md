+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "No active implementation slice is open; the next work should be chosen from the next adoption-guidance refinement."
focus = "Choose the next structured adoption-guidance improvement now that Nexus setup flow is shared data."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Keep extending adoption guidance through shared structured data instead of renderer-only prose.", "Prefer small additive slices that improve JSON-first agent consumers without changing existing workflow wording.", "Open the next slice from the same adoption/agent-guidance seam so the contract stays coherent."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T17:20:00Z"
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

`SPEC-052` is complete. Nexus setup flow now lives in shared structured adoption data, so doctor JSON, the short agent brief, and the human adoption artifacts all read from the same bounded setup sequence instead of recomputing it in prose-only renderers. No follow-up slice is active yet; the next work should continue tightening JSON-first adoption guidance from this shared contract.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
