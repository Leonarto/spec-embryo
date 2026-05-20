+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "A new post-0.3.1 roadmap is in place for portfolio views, faster adoption, stronger resume flows, workflow automation, stable JSON contracts, and test reliability."
focus = "Choose and start the next post-adoption improvement slice from the new multi-repo and reliability roadmap."
active_spec_ids = ["SPEC-055"]
active_task_ids = []
blocked_task_ids = []
next_action_hints = ["Start TASK-111 to build the user-local portfolio registry and cross-project status surfaces.", "Use the new roadmap specs to sequence follow-on slices for profiles/import, resume/retrieval, automation/release, contract stability, and test reliability.", "Keep the post-0.3.1 roadmap focused on extending SpM as repo-local infrastructure rather than reimplementing model-native reasoning."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-05-20T22:28:00Z"
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

`0.3.1` has already been published, and the repo is no longer in release prep. The next planning checkpoint is a new backlog that turns SpM from a strong single-repo assistant into a broader portfolio and workflow platform without abandoning the local-first deterministic core. `SPEC-055` is the first active slice, focused on user-local portfolio views and multi-repo coordination, and the new roadmap now also captures profiles/import acceleration, stronger resume and retrieval control, repo hooks and release workflows, stable machine-consumable contracts, and self-hosting test hardening.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The next roadmap is intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
