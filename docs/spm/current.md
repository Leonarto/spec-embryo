+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "SPEC-061 P0/P1 and SPEC-062 shell, queries, both tables, detail extraction and graph optimization are committed. Inspector verification continues; measured relation fan-out requires TASK-138 before guarded questions and final acceptance."
focus = "Complete SPEC-062 UI revamp with parallel Sol 6.1 High implementation and Astra High technical/UX review; preserve completed SPEC-061 native-harness interoperability."
active_spec_ids = ["SPEC-062"]
active_task_ids = ["TASK-128"]
blocked_task_ids = []
next_action_hints = ["Finish TASK-128 inspector functional and DOM-containment gates, independent review and commit.", "Then implement shared bounded detail TASK-138 and Timeline TASK-130 in parallel with separate file ownership.", "TASK-129 guarded questions waits for TASK-138; TASK-131 validates final combined behavior, measured performance and package runtime."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-11-15T23:03:55.483Z"
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

The user authorized parallel implementation of `SPEC-061` and `SPEC-062`. Sol 6.1 High implements both tracks; Astra High owns technical decisions and UX review. A separate Astra investigates implementation and context practices, including simplicity, code relationships, review and model routing. Baseline commit `fa025f2` preserves the previous roadmap and reviewed plans. UI scope remains inspection, filtering, selection, and copying, preserving the existing spec-question response workflow.

SPEC-061 P0/P1 is complete through `d164e75`; P2 is explicitly deferred. SPEC-062 shell (`1b1d47a`) and shared query/refresh foundation (`0893166`) are complete. TASK-135 canonical detail extraction is approved and committed as `def5e38`. TASK-136 graph optimization is approved and committed as `d311060`. TASK-127 Tasks grid is approved and committed as `7386cb0`. TASK-137 Specs table is approved and committed as `439da07`, with shared filter/dropdown corrections committed separately. TASK-128 now integrates both tables with the inspector. One Sol owns product/browser verification; the other audits HTTP/SSR/import closure from a hashed isolated snapshot. A demonstrated Task/Spec relation fan-out requires TASK-138 after TASK-128: shared bounded transport and canonical/SSR/no-JS readers, preserving full relation access and the original detail latency gate. TASK-138 and TASK-130 run in parallel with separate ownership; TASK-129 waits for TASK-138. TASK-130 also consumes the completed graph checkpoint and integrates the committed detail contract before final review. The research report remains `docs/agent-workflow-research.md`; its two proposed skills are not installed, while bounded slices and independent review practices are in use.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The completed roadmap was intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
