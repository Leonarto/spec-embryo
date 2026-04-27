+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-040 is complete after separating direct command discoverability from snippet guidance; the next adoption data-structure slice is ready to be chosen."
focus = "Choose the next adoption data-structure slice"
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Pick the next adjacent adoption slice from the shared agent-facing guidance surfaces.", "Prefer promoting the new direct-command structure into reusable structured data rather than adding more wording variants.", "Keep snippet content, direct command guidance, and JSON guidance aligned."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-04-27T19:51:00.000Z"
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

SPEC-040 is now complete: the broader adoption and agent-facing outputs separate direct command discoverability from snippet-only guidance, which makes the long-form surfaces easier to scan without changing the actual command contract. The next adjacent slice should focus on structured reuse of that split, so JSON and typed consumers can benefit from the same separation instead of relying on render-only section layout.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
