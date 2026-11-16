+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Harness interoperability, both tables, persistent inspector, fresh-read IO and guarded question-write backend are reviewed. Timeline has 67 independent browser checks; bounded details are functionally reviewed but still require a valid passing 300 ms browser measurement."
focus = "Complete SPEC-062 UI revamp with parallel Sol 6.1 High implementation and Astra High technical/UX review; preserve completed SPEC-061 native-harness interoperability."
active_spec_ids = ["SPEC-062"]
active_task_ids = ["TASK-129", "TASK-130", "TASK-138"]
blocked_task_ids = []
next_action_hints = ["Close TASK-129 final build, package and independent review after approved editor, history and UX checks.", "Run the one approved copy-only diagnostic for the post-memo detail latency tails; the latest browser gate remains FAIL at Task979.2ms/Spec504.3ms p95.", "Finish combined Timeline/question integration, then TASK-131 verifies all final behavior, performance and packaged runtime gates."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-11-16T03:58:37.289Z"
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

SPEC-061 P0/P1 is complete through `d164e75`; P2 is explicitly deferred. The SPEC-062 shell, shared queries, Tasks/Specs grids, graph optimization, persistent inspector and fresh-read IO are reviewed and committed. TASK-140 guarded answer writes are committed as `ab9212a`, functional TASK-138 bounded details as `88cb574`, and the serialized TASK-130 inspector adapter as `d4e1b01`. The research report remains `docs/agent-workflow-research.md`; its two proposed skills are not installed, while bounded slices and independent review practices are in use.

H Sol owns TASK-129 editor/action/layout/guard implementation and browser verification. The TASK-138 private parse memo is independently reviewed and integrated; combined affected checks pass88 tests/910 assertions and Svelte check0/0. The exact f8a7e1d supported Node/Vite development-runtime browser gate fails at Task979.2ms/Spec504.3ms p95 versus300ms; earlier359/326.1ms results remain historical. UI Sol prepares one bounded copy-only diagnostic with server, memo and browser attribution; no cause, optimization or acceptance rerun is authorized from the timing alone. TASK-129 action/client/UX partial reviews are approved, including rapid-history and seed races; its final isolated suite passes444 tests/8990 assertions with Bun coverage92.50% functions/93.60% lines and Svelte check0/0. Build, package and final review remain pending. TASK-130 Timeline source has extensive isolated evidence but awaits combined129 integration and final source checks. TASK-131 preserves every final behavior, performance, accessibility and packaged-runtime gate, tracked in `web/verification/SPEC-062-acceptance.md`.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The completed roadmap was intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.
