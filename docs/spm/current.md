+++
doc_kind = "current-state"
id = "CURRENT"
title = "Current Project State"
summary = "Harness interoperability and the functional UI revamp are reviewed and committed, including compact tables, persistent inspectors, guarded questions and Timeline. Detail latency and final combined acceptance remain open."
focus = "Complete SPEC-062 UI revamp with parallel Sol 6.1 High implementation and Astra High technical/UX review; preserve completed SPEC-061 native-harness interoperability."
active_spec_ids = ["SPEC-062"]
active_task_ids = ["TASK-138", "TASK-141"]
blocked_task_ids = []
next_action_hints = ["Implement and independently review TASK141 precompiled runtime and real installed-package behavior.", "Preserve the final9a detail failure398/523.5ms; run final latency gates only after the reviewed material runtime commit.", "Complete reusable TASK131 accessibility checks and adapt its finite harness without changing thresholds."]
last_handoff_id = "HANDOFF-20260402T163915"
updated_at = "2026-11-16T16:52:51.165Z"
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

TASK-129 editor/action/layout/guards and TASK-130 Timeline are complete and independently approved, including their combined question/history/refresh flows. The TASK-138 private parse memo is independently reviewed and integrated; combined affected checks pass88 tests/910 assertions and Svelte check0/0. The exact f8a7e1d supported Node/Vite development-runtime browser gate fails at Task979.2ms/Spec504.3ms p95 versus300ms; earlier359/326.1ms results remain historical. The one copy-only diagnostic is complete and independently reviewed: memo hits and fresh reads are correct, contexts are serial, and delays occur inside context loading before response headers. GC contributes to one tail but does not explain the largest. A bounded static audit found avoidable eager promise/queue allocation; its timing benefit is unproven. The one bounded-admission candidate on9a446a1 is rejected: median+1.17%, maximum+12.20% and8/20 paired wins do not establish useful gain despite lower p95. No product edit or retry. The authorized final9a gate is complete: Task398.0ms/Spec523.5ms p95, both still failing300ms. Astra approved the separate TASK141 precompiled runtime design; Sol implements it in isolation before independent code/package review. Harness tiny-browser, cleanup/integrity and external CLI-bin smokes pass; final package UI and acceptance series remain pending. The combined7deb suite passes475 tests/10290 assertions with Bun aggregate92.51% functions/93.71% lines, Svelte check0/0 and build. Initial Tasks gzip JS delta41209bytes passes the61440byte limit; four serial dependency audits pass with the failed concurrent audit retained. TASK-129 final review approves the55-file manifest, action/client/UX fixes,444 tests/8990 assertions, Bun aggregate coverage92.50% functions/93.60% lines, Svelte check0/0, build, static closure and integrated smoke. Its package inventory is not final installed-runtime verification. TASK-130 final review approves69 payloads and27 source/test/script identities,35 tests/1369 assertions,15 combined editor/refresh checks, directed group-focus/live-region regressions and final visual review. Supported-runtime Timeline navigation p95 is1341.7ms (its own metric), Enter12.6ms and scroll34 rows/zero long tasks. TASK-131 preserves every final behavior, performance, accessibility and packaged-runtime gate, tracked in `web/verification/SPEC-062-acceptance.md`.

## Notes

- Prompt-return mode remains first-class to avoid unnecessary nested agent spawning.
- New substantive specs should follow the explicit draft -> user iteration -> review -> fix loop.
- The repo should increasingly manage itself through `docs/spm/` and `spm` commands instead of ad hoc memory.
- Adoption improvements should extend Codex/Claude behavior with repo-local workflow guidance, not reimplement model-native context handling.
- The completed roadmap was intentionally grouped into a small number of coherent specs instead of ten isolated one-off tasks so future implementation can sequence related work with fewer cross-slice rewrites.
- Managed document creation now relies on a shared repository lock; future create flows should preserve that invariant instead of adding unsynchronized ID allocation paths.
- Changed-item reporting now has nine coupled invariants: identity-plus-path human formatting, one normalized `changeHint` for compact summaries, one compact raw `statusCode` for structured consumers, a managed-first presentation order limited to human status-style summaries, an explicit omitted-count signal when human-visible summary slices are truncated, shared helper logic so the truncation note wording stays aligned across status-style outputs, an explicit resume context-pack note when additional changed files were moved into offloaded detail, a matching `nextInspectIds` trail for the highest-value omitted changed files, and typed `nextInspect` entries so callers can distinguish doc refs from changed-file paths.

## Current runtime checkpoint

The single final9a detail gate is a valid FAIL: Task398.0ms/Spec523.5ms p95. Astra approved TASK141's precompiled runtime design and independent design review; Sol implements it in an isolated source copy. No unchanged-runtime retry or threshold relaxation. Combined7deb checks pass475 tests/10290 assertions, Svelte0/0 and build; initial Tasks gzip JS grows41209bytes against61440 allowed, with Mermaid absent. Dependency audits pass when performed serially in independent processes; the failed concurrent Bun realpath audit is retained separately. TASK131 continues component accessibility and later consumes the reviewed TASK141 runtime for final package/performance gates.
