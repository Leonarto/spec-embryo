+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-047 is complete after adding structured capability-refresh review checks to shared adoption guidance."
focus = "Choose the next adoption or agent-guidance slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Prefer the next slice that turns another adoption-only prose checklist into structured data for wrappers.", "Keep shared adoption guidance aligned across doctor, init, direct agent brief, and `spm agent brief --json` from one deterministic contract.", "Favor small additive slices over broad wording churn."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-28T15:20:00Z"
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

`SPEC-047` is now complete. Capability refresh guidance keeps its existing text actions and typed commands, and it now also exposes structured review checks so JSON-first callers can tell what to verify after an SpM upgrade without scraping prose. The next meaningful slice should keep tightening the shared adoption contract instead of duplicating the same guidance in more renderers.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
