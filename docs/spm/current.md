+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "The post-0.3.1 roadmap remains implemented in the working tree. Two proposed plans now evaluate native agent harness interoperability and a compact high-volume UI; implementation will use Sol 6.1 High."
focus = "Astra High planning and independent review complete for SPEC-061 and SPEC-062; no implementation slice started."
active_spec_ids = []
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Select the first implementation slice from the reviewed SPEC-061 and SPEC-062 proposals.", "Preserve existing roadmap changes while establishing the next implementation checkpoint.", "Use Astra High for technical and UX decisions; use Sol 6.1 High when executing the chosen plan."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-11-15T18:22:55.937Z"
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

The post-`0.3.1` roadmap implementation is complete. `SPEC-055` through `SPEC-060` are done, and `TASK-111` through `TASK-122` are done. SpM now has user-local portfolio views, explicit cross-project links, project profiles, deterministic legacy import, `resume --since`, memory ranking controls, bounded hook planning, release planning, schema-versioned JSON outputs, compatibility tests, and self-hosting test diagnostics.

There is no active implementation slice right now. `SPEC-061` and `SPEC-062` are proposed plans for native agent harness interoperability and a compact, high-volume UI. Planning, technical evaluation, and UX decisions use Astra High; execution of a chosen plan will use Sol 6.1 High. The user confirmed that UI scope is inspection, filtering, selection, and copying, preserving the existing spec-question response workflow.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The completed roadmap was intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
